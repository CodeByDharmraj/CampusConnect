const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const env = require('../config/env')

const ACCESS_TOKEN_TTL = '15m'

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id.toString(),
      role: user.role,
    },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: 'campusconnect-api',
      audience: 'campusconnect-client',
    },
  )
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
    issuer: 'campusconnect-api',
    audience: 'campusconnect-client',
  })
}

function createRefreshToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
}
