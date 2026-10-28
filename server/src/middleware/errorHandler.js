const ApiError = require('../utils/ApiError')

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  const isApiError = err instanceof ApiError
  const statusCode = isApiError ? err.statusCode : 500

  const message =
    isApiError && statusCode < 500
      ? err.message
      : statusCode === 500
        ? 'Internal server error'
        : 'Request failed'

  const code = isApiError
    ? err.code
    : statusCode === 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'REQUEST_FAILED'

  if (statusCode >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'HTTP request failed',
        method: req.method,
        path: req.path,
        statusCode,
        errorName: err.name || 'Error',
      }),
    )
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
  })
}

module.exports = errorHandler
