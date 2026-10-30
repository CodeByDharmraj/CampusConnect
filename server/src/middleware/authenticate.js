const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const asyncHandler = require('../utils/asyncHandler')
const { verifyAccessToken } = require('../utils/authTokens')

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get('Authorization')

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  const token = authorization.slice('Bearer '.length).trim()

  if (!token || token.split('.').length !== 3) {
    throw new ApiError(401, 'Invalid access token.', 'INVALID_ACCESS_TOKEN')
  }

  let payload

  try {
    payload = verifyAccessToken(token)
  } catch {
    throw new ApiError(
      401,
      'Invalid or expired access token.',
      'INVALID_ACCESS_TOKEN',
    )
  }

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !payload.sub
  ) {
    throw new ApiError(401, 'Invalid access token.', 'INVALID_ACCESS_TOKEN')
  }

  const user = await User.findById(payload.sub)

  if (!user || !user.isActive) {
    throw new ApiError(
      401,
      'Authentication is no longer valid.',
      'INVALID_ACCESS_TOKEN',
    )
  }

  req.user = user
  next()
})

module.exports = authenticate
