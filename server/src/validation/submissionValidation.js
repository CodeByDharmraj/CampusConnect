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

  rejectUnexpectedFields(body, [
    'assignmentId',
    'objectKey',
    'fileName',
    'contentType',
    'fileSize',
  ])

  const assignmentId = validateObjectId(body.assignmentId, 'assignment')

  if (typeof body.objectKey !== 'string' || body.objectKey.length > 500) {
    reject('A valid storage object key is required.')
  }

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
    objectKey: body.objectKey,
    fileName: body.fileName.trim(),
    contentType: body.contentType,
    fileSize: body.fileSize,
  }
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
