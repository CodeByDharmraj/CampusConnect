function notFound(req, res, _next) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  })
}

module.exports = notFound
