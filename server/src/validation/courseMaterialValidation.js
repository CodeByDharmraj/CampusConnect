const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function reject(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function requireObject(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    reject('Request body must be a JSON object.')
  }
}

function rejectUnexpectedFields(body, allowed) {
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    reject('Request contains unsupported fields.')
  }
}

function validateId(value, label) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject(`A valid ${label} ID is required.`)
  }
  return value
}

function validateUploadRequest(body) {
  requireObject(body)
  rejectUnexpectedFields(body, [
    'courseOfferingId',
    'title',
    'description',
    'fileName',
    'contentType',
    'fileSize',
    'visibility',
  ])

  const courseOfferingId = validateId(body.courseOfferingId, 'course offering')
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 150) {
    reject('Title must contain between 2 and 150 characters.')
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 1000)) {
    reject('Description cannot exceed 1000 characters.')
  }
  if (typeof body.fileName !== 'string' || !body.fileName.trim() || body.fileName.trim().length > 255) {
    reject('A valid file name is required.')
  }
  if (!ALLOWED_CONTENT_TYPES.has(body.contentType)) {
    reject('Only PDF, DOCX, PPTX and XLSX files are supported.')
  }
  if (!Number.isSafeInteger(body.fileSize) || body.fileSize < 1 || body.fileSize > 10 * 1024 * 1024) {
    reject('File size must be between 1 byte and 10 MB.')
  }
  if (body.visibility !== undefined && !['enrolled', 'faculty'].includes(body.visibility)) {
    reject('Visibility must be enrolled or faculty.')
  }

  return {
    courseOfferingId,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    fileName: body.fileName.trim(),
    contentType: body.contentType,
    fileSize: body.fileSize,
    visibility: body.visibility || 'enrolled',
  }
}

function validateCompleteRequest(body) {
  requireObject(body)
  rejectUnexpectedFields(body, [
    'courseOfferingId', 'objectKey', 'title', 'description',
    'fileName', 'contentType', 'fileSize', 'visibility',
  ])
  const courseOfferingId = validateId(body.courseOfferingId, 'course offering')
  if (typeof body.objectKey !== 'string' || !body.objectKey.startsWith(`course-materials/${courseOfferingId}/`) || body.objectKey.length > 500) {
    reject('A valid course material storage key is required.')
  }
  if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 150) {
    reject('Title must contain between 2 and 150 characters.')
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 1000)) {
    reject('Description cannot exceed 1000 characters.')
  }
  if (typeof body.fileName !== 'string' || !body.fileName.trim() || body.fileName.trim().length > 255) {
    reject('A valid file name is required.')
  }
  if (!ALLOWED_CONTENT_TYPES.has(body.contentType)) {
    reject('Only PDF, DOCX, PPTX and XLSX files are supported.')
  }
  if (!Number.isSafeInteger(body.fileSize) || body.fileSize < 1 || body.fileSize > 10 * 1024 * 1024) {
    reject('File size must be between 1 byte and 10 MB.')
  }
  if (body.visibility !== undefined && !['enrolled', 'faculty'].includes(body.visibility)) {
    reject('Visibility must be enrolled or faculty.')
  }

  return {
    courseOfferingId,
    objectKey: body.objectKey,
    title: body.title.trim(),
    description: body.description?.trim() || '',
    fileName: body.fileName.trim(),
    contentType: body.contentType,
    fileSize: body.fileSize,
    visibility: body.visibility || 'enrolled',
  }
}

function validateOfferingId(value) {
  return validateId(value, 'course offering')
}

function validateMaterialId(value) {
  return validateId(value, 'course material')
}

module.exports = {
  validateUploadRequest,
  validateCompleteRequest,
  validateOfferingId,
  validateMaterialId,
}
