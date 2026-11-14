const env = require('../config/env')
const ApiError = require('../utils/ApiError')

function requireTrustedOrigin(req, res, next) {
  const origin = req.get('Origin')

  if (origin !== env.CLIENT_ORIGIN) {
    return next(
      new ApiError(403, 'Request origin is not allowed.', 'UNTRUSTED_ORIGIN'),
    )
  }

  return next()
}

module.exports = requireTrustedOrigin
