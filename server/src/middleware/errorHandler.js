function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500

  const message =
    statusCode === 500
      ? 'Internal server error'
      : err.message || 'Request failed'

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

  return res.status(statusCode).json({
    success: false,
    message,
  })
}

module.exports = errorHandler
