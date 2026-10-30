const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const { createAccessToken } = require('../utils/authTokens')
const {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
} = require('./refreshSessionService')

async function provisionUser({ name, email, password, role }) {
  if (!User.USER_ROLES.includes(role)) {
    throw new ApiError(400, 'Invalid user role.', 'VALIDATION_ERROR')
  }

  const user = new User({
    name,
    email,
    role,
    isActive: true,
  })

  await user.setPassword(password)

  try {
    await user.save()
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        'An account with this email already exists.',
        'EMAIL_ALREADY_EXISTS',
      )
    }

    throw error
  }

  return user
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash')

  if (!user || !(await user.verifyPassword(password)) || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS')
  }

  const refreshSession = await createRefreshSession(user._id)
  const accessToken = createAccessToken(user)

  return {
    user,
    accessToken,
    refreshToken: refreshSession.token,
    refreshExpiresAt: refreshSession.expiresAt,
  }
}

async function refresh(refreshToken) {
  const rotatedSession = await rotateRefreshSession(refreshToken)

  if (!rotatedSession) {
    throw new ApiError(
      401,
      'Refresh session is invalid or expired.',
      'INVALID_REFRESH_TOKEN',
    )
  }

  const user = await User.findById(rotatedSession.userId)

  if (!user || !user.isActive) {
    await revokeRefreshSession(rotatedSession.token)

    throw new ApiError(
      401,
      'Authentication is no longer valid.',
      'INVALID_REFRESH_TOKEN',
    )
  }

  return {
    user,
    accessToken: createAccessToken(user),
    refreshToken: rotatedSession.token,
    refreshExpiresAt: rotatedSession.expiresAt,
  }
}

async function logout(refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return
  }

  await revokeRefreshSession(refreshToken)
}

module.exports = {
  provisionUser,
  login,
  refresh,
  logout,
}
