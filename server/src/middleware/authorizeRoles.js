const ApiError = require('../utils/ApiError')
const { ROLE_VALUES } = require('../constants/roles')

const ALLOWED_ROLES = new Set(ROLE_VALUES)

function authorizeRoles(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !ALLOWED_ROLES.has(role))
  ) {
    throw new TypeError('At least one valid role must be specified.')
  }

  function roleAuthorization(req, res, next) {
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

  // Expose the guard's rule so tooling (API docs, tests) can read the real
  // security configuration of a route instead of duplicating it.
  roleAuthorization.allowedRoles = Object.freeze([...allowedRoles])

  return roleAuthorization
}

module.exports = authorizeRoles
