const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

const CREATE_FIELDS = [
  'courseOfferingId',
  'title',
  'description',
  'instructions',
  'dueDate',
]

const UPDATE_FIELDS = ['title', 'description', 'instructions', 'dueDate']

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

function validateTitle(value) {
  if (typeof value !== 'string') {
    reject('Assignment title is required.')
  }

  const title = value.trim()

  if (title.length < 3 || title.length > 150) {
    reject('Title must contain between 3 and 150 characters.')
  }

  return title
}

function validateDescription(value) {
  if (typeof value !== 'string') {
    reject('Assignment description is required.')
  }

  const description = value.trim()

  if (!description || description.length > 5000) {
    reject('Description must contain between 1 and 5000 characters.')
  }

  return description
}

function validateInstructions(value) {
  if (value === undefined) return undefined

  if (typeof value !== 'string' || value.length > 10000) {
    reject('Instructions must be a string of at most 10000 characters.')
  }

  return value.trim()
}

function validateDueDate(value) {
  if (value === null || value === '') return null

  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    reject('A valid due date is required.')
  }

  const dueDate = new Date(value)

  if (!Number.isFinite(dueDate.getTime())) {
    reject('A valid due date is required.')
  }

  return dueDate
}

function validateCreateAssignment(body) {
  requireObject(body)
  rejectUnexpectedFields(body, CREATE_FIELDS)

  if (!Object.hasOwn(body, 'courseOfferingId')) {
    reject('Course offering is required.')
  }

  if (!Object.hasOwn(body, 'title')) {
    reject('Assignment title is required.')
  }

  if (!Object.hasOwn(body, 'description')) {
    reject('Assignment description is required.')
  }

  const result = {
    courseOfferingId: validateObjectId(
      body.courseOfferingId,
      'course offering',
    ),
    title: validateTitle(body.title),
    description: validateDescription(body.description),
  }

  if (Object.hasOwn(body, 'instructions')) {
    result.instructions = validateInstructions(body.instructions)
  }

  if (Object.hasOwn(body, 'dueDate')) {
    result.dueDate = validateDueDate(body.dueDate)
  }

  return result
}

function validateUpdateAssignment(body) {
  requireObject(body)
  rejectUnexpectedFields(body, UPDATE_FIELDS)

  const fields = Object.keys(body)

  if (fields.length === 0) {
    reject('At least one assignment field must be provided.')
  }

  const result = {}

  if (Object.hasOwn(body, 'title')) {
    result.title = validateTitle(body.title)
  }

  if (Object.hasOwn(body, 'description')) {
    result.description = validateDescription(body.description)
  }

  if (Object.hasOwn(body, 'instructions')) {
    result.instructions = validateInstructions(body.instructions)
  }

  if (Object.hasOwn(body, 'dueDate')) {
    result.dueDate = validateDueDate(body.dueDate)
  }

  return result
}

function validateAssignmentId(value) {
  return validateObjectId(value, 'assignment')
}

module.exports = {
  validateCreateAssignment,
  validateUpdateAssignment,
  validateAssignmentId,
}
