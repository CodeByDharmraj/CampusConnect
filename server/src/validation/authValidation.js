const ApiError = require('../utils/ApiError')
const { ROLE_VALUES, DEPARTMENT_REQUIRED_ROLES } = require('../constants/roles')

const MAX_PASSWORD_BYTES = 72
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

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

function validateEmail(value) {
  if (typeof value !== 'string') {
    reject('A valid email address is required.')
  }

  const email = value.trim().toLowerCase()

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    reject('A valid email address is required.')
  }

  return email
}

function validatePassword(value, fieldName = 'Password') {
  if (typeof value !== 'string') {
    reject(`${fieldName} must be a string.`)
  }

  if (value.length < 8) {
    reject(`${fieldName} must contain at least 8 characters.`)
  }

  if (Buffer.byteLength(value, 'utf8') > MAX_PASSWORD_BYTES) {
    reject(`${fieldName} exceeds the supported password byte limit.`)
  }

  return value
}

function validateRegister(body) {
  requireObject(body)
  rejectUnexpectedFields(body, ['name', 'email', 'password'])

  if (typeof body.name !== 'string') {
    reject('Name is required.')
  }

  const name = body.name.trim()

  if (name.length < 2 || name.length > 100) {
    reject('Name must contain between 2 and 100 characters.')
  }

  return {
    name,
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  }
}

function validateProvisionUser(body) {
  requireObject(body)
  rejectUnexpectedFields(body, [
    'name',
    'email',
    'password',
    'role',
    'departmentId',
  ])

  const user = validateRegister({
    name: body.name,
    email: body.email,
    password: body.password,
  })

  if (typeof body.role !== 'string' || !ROLE_VALUES.includes(body.role)) {
    reject('A valid user role is required.')
  }

  const departmentIdProvided = Object.hasOwn(body, 'departmentId')

  if (DEPARTMENT_REQUIRED_ROLES.includes(body.role)) {
    if (
      typeof body.departmentId !== 'string' ||
      !OBJECT_ID_PATTERN.test(body.departmentId)
    ) {
      reject('A valid department ID is required for this user role.')
    }
  } else if (departmentIdProvided) {
    reject('Faculty and administrators cannot have a primary department.')
  }

  return {
    ...user,
    role: body.role,
    ...(DEPARTMENT_REQUIRED_ROLES.includes(body.role)
      ? { departmentId: body.departmentId }
      : {}),
  }
}

function validateLogin(body) {
  requireObject(body)
  rejectUnexpectedFields(body, ['email', 'password'])

  return {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  }
}

function validateForgotPassword(body) {
  requireObject(body)
  rejectUnexpectedFields(body, ['email'])

  return {
    email: validateEmail(body.email),
  }
}

function validateResetPassword(body) {
  requireObject(body)
  rejectUnexpectedFields(body, ['resetToken', 'newPassword'])

  if (typeof body.resetToken !== 'string') {
    reject('A valid reset token is required.')
  }

  const resetToken = body.resetToken.trim()

  if (resetToken.length < 20 || resetToken.length > 512) {
    reject('A valid reset token is required.')
  }

  return {
    resetToken,
    newPassword: validatePassword(body.newPassword, 'New password'),
  }
}

function validateUserListQuery(query) {
  const role = query?.role

  if (role === undefined) return {}

  if (typeof role !== 'string' || !ROLE_VALUES.includes(role)) {
    reject('A valid user role is required.')
  }

  return { role }
}

module.exports = {
  validateUserListQuery,
  validateRegister,
  validateProvisionUser,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
}
