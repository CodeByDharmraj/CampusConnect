const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')

function authorizeResource({ loadResource, canAccess, resourceParam = 'id' }) {
  if (typeof loadResource !== 'function') {
    throw new TypeError('loadResource must be a function.')
  }

  if (typeof canAccess !== 'function') {
    throw new TypeError('canAccess must be a function.')
  }

  if (typeof resourceParam !== 'string' || !resourceParam.trim()) {
    throw new TypeError('resourceParam must be a non-empty string.')
  }

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(
        401,
        'Authentication is required.',
        'AUTHENTICATION_REQUIRED',
      )
    }

    const resourceId = req.params?.[resourceParam]

    if (typeof resourceId !== 'string' || !resourceId.trim()) {
      throw new ApiError(
        400,
        'A valid resource identifier is required.',
        'INVALID_RESOURCE_ID',
      )
    }

    const resource = await loadResource(resourceId, req)

    if (!resource) {
      throw new ApiError(404, 'Resource not found.', 'RESOURCE_NOT_FOUND')
    }

    const allowed = await canAccess({
      user: req.user,
      resource,
      req,
    })

    if (allowed !== true) {
      throw new ApiError(
        403,
        'You do not have permission to access this resource.',
        'FORBIDDEN',
      )
    }

    req.resource = resource

    return next()
  })
}

module.exports = authorizeResource
