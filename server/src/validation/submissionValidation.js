const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
])

function reject(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function requireObject(body) {
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    reject('Request body must be a JSON object.')
  }
}

function rejectUnexpectedFields(body, allowedFields) {
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    reject('Request contains unsupported fields.')
  }
}

function validateObjectId(value, fieldName) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject(`A valid ${fieldName} ID is required.`)
  }

  return value
}

function validateUploadRequest(body) {
  requireObject(body)

  rejectUnexpectedFields(body, [
    'assignmentId',
    'fileName',
    'contentType',
    'fileSize',
  ])

  const assignmentId = validateObjectId(body.assignmentId, 'assignment')

  if (
    typeof body.fileName !== 'string' ||
    !body.fileName.trim() ||
    body.fileName.trim().length > 255
  ) {
    reject('A valid file name is required.')
  }

  if (
    typeof body.contentType !== 'string' ||
    !ALLOWED_CONTENT_TYPES.has(body.contentType)
  ) {
    reject('This file type is not supported.')
  }

  if (
    !Number.isSafeInteger(body.fileSize) ||
    body.fileSize < 1 ||
    body.fileSize > 10 * 1024 * 1024
  ) {
    reject('File size must be between 1 byte and 10 MB.')
  }

  return {
    assignmentId,
    fileName: body.fileName.trim(),
    contentType: body.contentType,
    fileSize: body.fileSize,
  }
}

function validateCompleteRequest(body) {
  requireObject(body)

  const allowedFields = [
    'assignmentId',
    'files',
    // Backward compatibility for clients using the original single-file flow.
    'objectKey',
    'fileName',
    'contentType',
    'fileSize',
  ]
  rejectUnexpectedFields(body, allowedFields)

  const assignmentId = validateObjectId(body.assignmentId, 'assignment')
  let files

  if (Array.isArray(body.files)) {
    if (body.files.length < 1 || body.files.length > 3) {
      reject('Choose between 1 and 3 files for each submission.')
    }

    files = body.files.map((file, index) => {
      if (
        file === null ||
        typeof file !== 'object' ||
        Array.isArray(file) ||
        Object.getPrototypeOf(file) !== Object.prototype
      ) {
        reject(`File ${index + 1} must be a valid object.`)
      }

      rejectUnexpectedFields(file, [
        'objectKey',
        'fileName',
        'contentType',
        'fileSize',
      ])

      if (typeof file.objectKey !== 'string' || file.objectKey.length > 500) {
        reject(`A valid storage object key is required for file ${index + 1}.`)
      }

      if (
        typeof file.fileName !== 'string' ||
        !file.fileName.trim() ||
        file.fileName.trim().length > 255
      ) {
        reject(`A valid file name is required for file ${index + 1}.`)
      }

      if (
        typeof file.contentType !== 'string' ||
        !ALLOWED_CONTENT_TYPES.has(file.contentType)
      ) {
        reject(`File ${index + 1} has an unsupported file type.`)
      }

      if (
        !Number.isSafeInteger(file.fileSize) ||
        file.fileSize < 1 ||
        file.fileSize > 10 * 1024 * 1024
      ) {
        reject(`File ${index + 1} must be between 1 byte and 10 MB.`)
      }

      return {
        objectKey: file.objectKey,
        fileName: file.fileName.trim(),
        contentType: file.contentType,
        fileSize: file.fileSize,
      }
    })
  } else {
    // Normalize the previous single-file request into the new multipart shape.
    if (
      typeof body.objectKey !== 'string' ||
      body.objectKey.length > 500 ||
      typeof body.fileName !== 'string' ||
      !body.fileName.trim() ||
      body.fileName.trim().length > 255 ||
      typeof body.contentType !== 'string' ||
      !ALLOWED_CONTENT_TYPES.has(body.contentType) ||
      !Number.isSafeInteger(body.fileSize) ||
      body.fileSize < 1 ||
      body.fileSize > 10 * 1024 * 1024
    ) {
      reject('A valid uploaded file is required.')
    }

    files = [{
      objectKey: body.objectKey,
      fileName: body.fileName.trim(),
      contentType: body.contentType,
      fileSize: body.fileSize,
    }]
  }

  const totalSize = files.reduce((total, file) => total + file.fileSize, 0)

  if (totalSize > 20 * 1024 * 1024) {
    reject('The combined submission size cannot exceed 20 MB.')
  }

  return { assignmentId, files }
}

function validateAssignmentId(value) {
  return validateObjectId(value, 'assignment')
}

function validateSubmissionId(value) {
  return validateObjectId(value, 'submission')
}

function validateEvaluation(body) {
  requireObject(body)

  rejectUnexpectedFields(body, ['grade', 'feedback'])

  if (
    typeof body.grade !== 'number' ||
    !Number.isFinite(body.grade) ||
    body.grade < 0 ||
    body.grade > 100
  ) {
    reject('Grade must be a number between 0 and 100.')
  }

  if (
    body.feedback !== undefined &&
    (typeof body.feedback !== 'string' || body.feedback.length > 5000)
  ) {
    reject('Feedback must be a string of at most 5000 characters.')
  }

  return {
    grade: body.grade,
    feedback: body.feedback?.trim() || '',
  }
}

module.exports = {
  validateUploadRequest,
  validateCompleteRequest,
  validateAssignmentId,
  validateSubmissionId,
  validateEvaluation,
}
