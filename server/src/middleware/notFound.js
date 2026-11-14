const ApiError = require('../utils/ApiError')

function notFound(req, res, next) {
  next(new ApiError(404, 'Route not found', 'RESOURCE_NOT_FOUND'))
}

module.exports = notFound
