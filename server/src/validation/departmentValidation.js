const ApiError = require('../utils/ApiError')

const CREATE_FIELDS = ['name', 'code', 'description']

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

function validateCreateDepartment(body) {
  requireObject(body)

  const unexpectedFields = Object.keys(body).filter(
    (field) => !CREATE_FIELDS.includes(field),
  )

  if (unexpectedFields.length > 0) {
    reject('Request contains unsupported fields.')
  }

  if (typeof body.name !== 'string') {
    reject('Department name is required.')
  }

  const name = body.name.trim()

  if (name.length < 2 || name.length > 100) {
    reject('Department name must contain between 2 and 100 characters.')
  }

  if (typeof body.code !== 'string') {
    reject('Department code is required.')
  }

  const code = body.code.trim().toUpperCase()

  if (code.length < 2 || code.length > 12 || !/^[A-Z0-9-]+$/.test(code)) {
    reject('Department code must contain 2 to 12 letters, numbers or hyphens.')
  }

  let description = ''

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      reject('Department description must be a string.')
    }

    description = body.description.trim()

    if (description.length > 500) {
      reject('Department description cannot exceed 500 characters.')
    }
  }

  return { name, code, description }
}

module.exports = {
  validateCreateDepartment,
}
