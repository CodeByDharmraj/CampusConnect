function requestLogger(req, res, next) {
  const startTime = Date.now()

  res.on('finish', () => {
    const logEntry = {
      level: 'info',
      message: 'HTTP request completed',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
    }

    console.log(JSON.stringify(logEntry))
  })

  next()
}

module.exports = requestLogger
