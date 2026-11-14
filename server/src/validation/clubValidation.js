const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Social',
  'Entrepreneurship',
  'Other',
]
const CREATE_FIELDS = ['name', 'description', 'category', 'departmentId']
const UPDATE_FIELDS = ['name', 'description', 'category']

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

function validateName(value) {
  if (typeof value !== 'string') reject('Club name is required.')
  const name = value.trim()
  if (name.length < 3 || name.length > 100) {
    reject('Club name must contain between 3 and 100 characters.')
  }
  return name
}

function validateDescription(value) {
  if (typeof value !== 'string') reject('Club description is required.')
  const description = value.trim()
  if (description.length < 20 || description.length > 2000) {
    reject('Club description must contain between 20 and 2000 characters.')
  }
  return description
}

function validateCategory(value) {
  if (!CATEGORIES.includes(value)) reject('Choose a valid club category.')
  return value
}

function validateDepartmentId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject('A valid department ID is required.')
  }
  return value
}

function rejectUnexpectedFields(body, allowedFields) {
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    reject('Request contains unsupported fields.')
  }
}

function validateCreateClub(body) {
  requireObject(body)
  rejectUnexpectedFields(body, CREATE_FIELDS)

  const result = {
    name: validateName(body.name),
    description: validateDescription(body.description),
    category: validateCategory(body.category),
  }

  if (Object.hasOwn(body, 'departmentId')) {
    result.departmentId = validateDepartmentId(body.departmentId)
  }

  return result
}

function validateUpdateClub(body) {
  requireObject(body)
  rejectUnexpectedFields(body, UPDATE_FIELDS)

  const fields = Object.keys(body)
  if (fields.length === 0) reject('At least one club field must be provided.')

  const result = {}
  if (Object.hasOwn(body, 'name')) result.name = validateName(body.name)
  if (Object.hasOwn(body, 'description')) {
    result.description = validateDescription(body.description)
  }
  if (Object.hasOwn(body, 'category')) {
    result.category = validateCategory(body.category)
  }

  return result
}

function validateClubId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject('A valid club ID is required.')
  }
  return value
}

function validateClubSlug(value) {
  if (
    typeof value !== 'string' ||
    value.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    reject('A valid club slug is required.')
  }
  return value
}

function validateClubQuery(query) {
  const allowed = ['q', 'category', 'departmentId']
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    reject('Unsupported club filter.')
  }

  const result = {}
  if (query.q !== undefined) {
    if (typeof query.q !== 'string' || query.q.trim().length > 100) {
      reject('Club search must be 100 characters or fewer.')
    }
    result.q = query.q.trim()
  }
  if (query.category !== undefined) {
    result.category = validateCategory(query.category)
  }
  if (query.departmentId !== undefined) {
    result.departmentId = validateDepartmentId(query.departmentId)
  }
  return result
}

module.exports = {
  validateCreateClub,
  validateUpdateClub,
  validateClubId,
  validateClubSlug,
  validateClubQuery,
}
