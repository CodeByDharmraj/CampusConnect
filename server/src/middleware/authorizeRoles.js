const ApiError = require('../utils/ApiError')

const ALLOWED_ROLES = new Set(['student', 'faculty', 'coordinator', 'admin'])

function authorizeRoles(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !ALLOWED_ROLES.has(role))
  ) {
    throw new TypeError('At least one valid role must be specified.')
  }

  return function roleAuthorization(req, res, next) {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          'Authentication is required.',
          'AUTHENTICATION_REQUIRED',
        ),
      )
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          'You do not have permission to perform this action.',
          'FORBIDDEN',
        ),
      )
    }

    return next()
  }
}

module.exports = authorizeRoles
