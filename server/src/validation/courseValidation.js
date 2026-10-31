const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const COURSE_CODE_PATTERN = /^[A-Z0-9-]+$/

const CREATE_FIELDS = ['name', 'code', 'description', 'credits', 'departmentId']

const UPDATE_FIELDS = ['name', 'code', 'description', 'credits']

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
  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  )

  if (unexpectedFields.length > 0) {
    reject('Request contains unsupported fields.')
  }
}

function validateName(value) {
  if (typeof value !== 'string') {
    reject('Course name is required.')
  }

  const name = value.trim()

  if (name.length < 2 || name.length > 150) {
    reject('Course name must contain between 2 and 150 characters.')
  }

  return name
}

function validateCode(value) {
  if (typeof value !== 'string') {
    reject('Course code is required.')
  }

  const code = value.trim().toUpperCase()

  if (code.length < 2 || code.length > 20 || !COURSE_CODE_PATTERN.test(code)) {
    reject('Course code must contain 2 to 20 letters, numbers or hyphens.')
  }

  return code
}

function validateDescription(value) {
  if (typeof value !== 'string') {
    reject('Course description must be a string.')
  }

  const description = value.trim()

  if (description.length > 500) {
    reject('Course description cannot exceed 500 characters.')
  }

  return description
}

function validateCredits(value) {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    reject('Course credits must be an integer between 1 and 10.')
  }

  return value
}

function validateDepartmentId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject('A valid department ID is required.')
  }

  return value
}

function validateCreateCourse(body) {
  requireObject(body)
  rejectUnexpectedFields(body, CREATE_FIELDS)

  const result = {
    name: validateName(body.name),
    code: validateCode(body.code),
    description:
      body.description === undefined
        ? ''
        : validateDescription(body.description),
    credits: validateCredits(body.credits),
  }

  if (Object.hasOwn(body, 'departmentId')) {
    result.departmentId = validateDepartmentId(body.departmentId)
  }

  return result
}

function validateUpdateCourse(body) {
  requireObject(body)
  rejectUnexpectedFields(body, UPDATE_FIELDS)

  const fields = Object.keys(body)

  if (fields.length === 0) {
    reject('At least one course field must be provided.')
  }

  const result = {}

  if (Object.hasOwn(body, 'name')) {
    result.name = validateName(body.name)
  }

  if (Object.hasOwn(body, 'code')) {
    result.code = validateCode(body.code)
  }

  if (Object.hasOwn(body, 'description')) {
    result.description = validateDescription(body.description)
  }

  if (Object.hasOwn(body, 'credits')) {
    result.credits = validateCredits(body.credits)
  }

  return result
}

function validateCourseId(courseId) {
  if (typeof courseId !== 'string' || !OBJECT_ID_PATTERN.test(courseId)) {
    reject('A valid course ID is required.')
  }

  return courseId
}

module.exports = {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseId,
}
