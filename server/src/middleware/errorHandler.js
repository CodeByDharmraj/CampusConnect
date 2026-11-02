const ApiError = require('../utils/ApiError')

function normalizeError(err) {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.statusCode < 500 ? err.message : 'Internal server error',
      code: err.code,
    }
  }

  if (err?.type === 'entity.too.large') {
    return {
      statusCode: 413,
      message: 'Request payload is too large.',
      code: 'PAYLOAD_TOO_LARGE',
    }
  }

  if (err?.type === 'entity.parse.failed') {
    return {
      statusCode: 400,
      message: 'Request body contains invalid JSON.',
      code: 'INVALID_JSON',
    }
  }

  if (err?.name === 'ValidationError' || err?.name === 'CastError') {
    return {
      statusCode: 400,
      message: 'Request contains invalid data.',
      code: 'VALIDATION_ERROR',
    }
  }

  if (err?.code === 11000) {
    return {
      statusCode: 409,
      message: 'A record with the supplied unique value already exists.',
      code: 'DUPLICATE_RESOURCE',
    }
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)

  const normalized = normalizeError(err)

  if (normalized.statusCode >= 500) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'HTTP request failed',
        method: req.method,
        path: req.path,
        statusCode: normalized.statusCode,
        errorName: err.name || 'Error',
      }),
    )
  }

  return res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    code: normalized.code,
  })
}

module.exports = errorHandler
