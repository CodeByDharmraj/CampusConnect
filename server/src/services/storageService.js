const crypto = require('node:crypto')
const yauzl = require('yauzl')

const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const env = require('../config/env')
const ApiError = require('../utils/ApiError')

const MAX_FILE_SIZE = 10 * 1024 * 1024
const UPLOAD_URL_EXPIRY_SECONDS = 300
const DOWNLOAD_URL_EXPIRY_SECONDS = 300

const ALLOWED_FILE_TYPES = Object.freeze({
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    'docx',
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    'pptx',
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/zip': ['zip'],
})

const OFFICE_REQUIRED_ENTRIES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '[Content_Types].xml',
    'word/document.xml',
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '[Content_Types].xml',
    'ppt/presentation.xml',
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '[Content_Types].xml',
    'xl/workbook.xml',
  ],
}

const s3Client = env.R2_ENABLED
  ? new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null

function requireStorageConfiguration() {
  if (!env.R2_ENABLED || !s3Client) {
    throw new ApiError(
      503,
      'File storage is not configured.',
      'STORAGE_NOT_CONFIGURED',
    )
  }
}

function validateUploadMetadata({ fileName, contentType, fileSize }) {
  if (
    typeof fileName !== 'string' ||
    !fileName.trim() ||
    fileName.length > 255
  ) {
    throw new ApiError(400, 'A valid file name is required.', 'INVALID_FILE')
  }

  const allowedExtensions = ALLOWED_FILE_TYPES[contentType]

  if (!allowedExtensions) {
    throw new ApiError(
      400,
      'This file type is not supported.',
      'UNSUPPORTED_FILE_TYPE',
    )
  }

  const extension = fileName.split('.').pop()?.toLowerCase()

  if (!allowedExtensions.includes(extension)) {
    throw new ApiError(
      400,
      'The file extension does not match the allowed file type.',
      'INVALID_FILE_EXTENSION',
    )
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 1 ||
    fileSize > MAX_FILE_SIZE
  ) {
    throw new ApiError(
      400,
      'File size must be between 1 byte and 10 MB.',
      'INVALID_FILE_SIZE',
    )
  }
}

function createObjectKey({ studentId, assignmentId }) {
  return `submissions/${studentId}/${assignmentId}/${crypto.randomUUID()}`
}

function inspectZipBuffer(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        return reject(
          new ApiError(
            400,
            'The uploaded file is not a valid ZIP-based document.',
            'INVALID_FILE_CONTENT',
          ),
        )
      }

      const entries = new Set()
      let settled = false

      function fail() {
        if (settled) return
        settled = true

        try {
          zipFile.close()
        } catch {
          // Ignore cleanup errors.
        }

        reject(
          new ApiError(
            400,
            'The uploaded ZIP document is invalid.',
            'INVALID_FILE_CONTENT',
          ),
        )
      }

      zipFile.on('error', fail)

      zipFile.on('entry', (entry) => {
        // Do not extract files. Only inspect archive entry names.
        entries.add(entry.fileName)
        zipFile.readEntry()
      })

      zipFile.on('end', () => {
        if (settled) return
        settled = true

        zipFile.close()
        resolve(entries)
      })

      zipFile.readEntry()
    })
  })
}

async function verifyFileContent(buffer, contentType) {
  if (contentType === 'application/pdf') {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new ApiError(
        400,
        'The uploaded file does not contain a valid PDF signature.',
        'INVALID_FILE_CONTENT',
      )
    }

    return
  }

  // ZIP-based files must start with a valid ZIP signature.
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ApiError(
      400,
      'The uploaded file does not contain a valid ZIP signature.',
      'INVALID_FILE_CONTENT',
    )
  }

  const entries = await inspectZipBuffer(buffer)

  const requiredEntries = OFFICE_REQUIRED_ENTRIES[contentType]

  if (
    requiredEntries &&
    !requiredEntries.every((entry) => entries.has(entry))
  ) {
    throw new ApiError(
      400,
      'The uploaded file does not match its declared Office document type.',
      'INVALID_FILE_CONTENT',
    )
  }

  if (contentType === 'application/zip' && entries.size === 0) {
    throw new ApiError(
      400,
      'The uploaded ZIP archive is empty or invalid.',
      'INVALID_FILE_CONTENT',
    )
  }
}

async function readObjectBody(body) {
  const chunks = []
  let totalSize = 0

  for await (const chunk of body) {
    totalSize += chunk.length

    if (totalSize > MAX_FILE_SIZE) {
      throw new ApiError(
        400,
        'The uploaded file exceeds the maximum allowed size.',
        'INVALID_FILE_SIZE',
      )
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks, totalSize)
}

async function createUploadUrl({
  studentId,
  assignmentId,
  fileName,
  contentType,
  fileSize,
}) {
  requireStorageConfiguration()

  validateUploadMetadata({ fileName, contentType, fileSize })

  const objectKey = createObjectKey({ studentId, assignmentId })

  const uploadHeaders = {
    'Content-Type': contentType,
    'x-amz-meta-studentid': String(studentId),
    'x-amz-meta-assignmentid': String(assignmentId),
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    Metadata: {
      studentid: String(studentId),
      assignmentid: String(assignmentId),
    },
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
    unhoistableHeaders: new Set([
      'x-amz-meta-studentid',
      'x-amz-meta-assignmentid',
    ]),
  })

  return {
    uploadUrl,
    uploadHeaders,
    objectKey,
    expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
  }
}

async function verifyUploadedObject({
  objectKey,
  studentId,
  assignmentId,
  expectedContentType,
  expectedFileSize,
}) {
  requireStorageConfiguration()

  const command = new HeadObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
  })

  let object

  try {
    object = await s3Client.send(command)
  } catch (error) {
    if (
      error.name === 'NotFound' ||
      error.name === 'NoSuchKey' ||
      error.$metadata?.httpStatusCode === 404
    ) {
      throw new ApiError(
        400,
        'The uploaded file could not be found.',
        'UPLOADED_FILE_NOT_FOUND',
      )
    }

    throw error
  }

  if (
    object.Metadata?.studentid !== String(studentId) ||
    object.Metadata?.assignmentid !== String(assignmentId)
  ) {
    throw new ApiError(
      403,
      'The uploaded file does not belong to this submission.',
      'INVALID_UPLOAD_OWNER',
    )
  }

  if (
    object.ContentType !== expectedContentType ||
    object.ContentLength !== expectedFileSize ||
    object.ContentLength > MAX_FILE_SIZE
  ) {
    throw new ApiError(
      400,
      'Uploaded file metadata does not match the requested file.',
      'UPLOAD_METADATA_MISMATCH',
    )
  }

  // Read the verified-size object and inspect its actual contents.
  const getObjectCommand = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
  })

  const uploadedObject = await s3Client.send(getObjectCommand)
  const buffer = await readObjectBody(uploadedObject.Body)

  if (buffer.length !== expectedFileSize) {
    throw new ApiError(
      400,
      'The uploaded file size could not be verified.',
      'UPLOAD_SIZE_MISMATCH',
    )
  }

  await verifyFileContent(buffer, expectedContentType)

  return {
    objectKey,
    contentType: object.ContentType,
    fileSize: object.ContentLength,
    etag: object.ETag || null,
  }
}

async function createDownloadUrl(objectKey) {
  requireStorageConfiguration()

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
  })

  return getSignedUrl(s3Client, command, {
    expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS,
  })
}

async function deleteObject(objectKey) {
  requireStorageConfiguration()

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
  })

  await s3Client.send(command)
}

module.exports = {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  createUploadUrl,
  verifyUploadedObject,
  createDownloadUrl,
  deleteObject,
}
