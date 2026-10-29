function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    return Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next)
  }
}

module.exports = asyncHandler
