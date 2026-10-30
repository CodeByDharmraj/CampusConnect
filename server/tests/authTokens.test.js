const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const env = require('../src/config/env')
const {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
} = require('../src/utils/authTokens')

test('access token includes user identity and role', () => {
  const token = createAccessToken({
    id: 'user-123',
    role: 'student',
  })

  const payload = verifyAccessToken(token)

  assert.equal(payload.sub, 'user-123')
  assert.equal(payload.role, 'student')
  assert.equal(payload.iss, 'campusconnect-api')
  assert.equal(payload.aud, 'campusconnect-client')
})

test('access token rejects invalid signatures', () => {
  const token = createAccessToken({
    id: 'user-123',
    role: 'student',
  })

  assert.throws(() => verifyAccessToken(`${token}invalid`))
})

test('access token rejects expired tokens', () => {
  const token = jwt.sign(
    { sub: 'user-123', role: 'student' },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: -1,
      issuer: 'campusconnect-api',
      audience: 'campusconnect-client',
    },
  )

  assert.throws(() => verifyAccessToken(token), {
    name: 'TokenExpiredError',
  })
})

test('refresh tokens are random and have no JWT structure', () => {
  const first = createRefreshToken()
  const second = createRefreshToken()

  assert.notEqual(first, second)
  assert.equal(first.split('.').length, 1)
  assert.equal(Buffer.from(first, 'base64url').length, 32)
})

test('refresh token hashing is deterministic without storing plaintext', () => {
  const token = createRefreshToken()
  const hash = hashRefreshToken(token)

  assert.equal(hash, hashRefreshToken(token))
  assert.notEqual(hash, token)
  assert.equal(hash.length, 64)
})
