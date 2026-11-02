const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

const env = require('../src/config/env')
const securityHeaders = require('../src/middleware/securityHeaders')
const createRateLimit = require('../src/middleware/rateLimit')
const errorHandler = require('../src/middleware/errorHandler')
const ApiError = require('../src/utils/ApiError')
const { verifyAccessToken } = require('../src/utils/authTokens')

function createResponse() {
  const headers = new Map()
  return {
    headers,
    statusCode: null,
    body: null,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value)
    },
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('security headers middleware sets browser hardening and no-store headers', () => {
  const response = createResponse()
  let nextCalled = false

  securityHeaders({}, response, () => {
    nextCalled = true
  })

  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('pragma'), 'no-cache')
  assert.match(
    response.headers.get('content-security-policy'),
    /frame-ancestors 'none'/,
  )
  assert.equal(nextCalled, true)
})

test('security headers enable HSTS only in production', (t) => {
  const original = process.env.NODE_ENV
  t.after(() => {
    if (original === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = original
  })

  process.env.NODE_ENV = 'production'
  const productionResponse = createResponse()
  securityHeaders({}, productionResponse, () => {})
  assert.equal(
    productionResponse.headers.get('strict-transport-security'),
    'max-age=15552000',
  )

  process.env.NODE_ENV = 'test'
  const testResponse = createResponse()
  securityHeaders({}, testResponse, () => {})
  assert.equal(testResponse.headers.has('strict-transport-security'), false)
})

test('rate limiter allows the configured number of requests', () => {
  const limiter = createRateLimit({ windowMs: 60_000, max: 2 })
  const response = createResponse()
  let nextCalls = 0
  const request = { ip: '192.0.2.10', socket: { remoteAddress: '192.0.2.10' } }

  limiter(request, response, () => { nextCalls += 1 })
  limiter(request, response, () => { nextCalls += 1 })

  assert.equal(nextCalls, 2)
  assert.equal(response.headers.get('ratelimit-limit'), '2')
  assert.equal(response.headers.get('ratelimit-remaining'), '0')
})

test('rate limiter rejects excess requests with HTTP 429 and Retry-After', () => {
  const limiter = createRateLimit({
    windowMs: 60_000,
    max: 1,
    message: 'Slow down.',
    code: 'TEST_RATE_LIMIT',
  })
  const response = createResponse()
  let receivedError

  const request = { ip: '192.0.2.11', socket: { remoteAddress: '192.0.2.11' } }
  limiter(request, createResponse(), () => {})
  limiter(request, response, (error) => { receivedError = error })

  assert.ok(receivedError instanceof ApiError)
  assert.equal(receivedError.statusCode, 429)
  assert.equal(receivedError.code, 'TEST_RATE_LIMIT')
  assert.ok(Number(response.headers.get('retry-after')) >= 1)
})

test('rate limiter keeps independent buckets for different source IPs', () => {
  const limiter = createRateLimit({ windowMs: 60_000, max: 1 })
  const firstResponse = createResponse()
  const secondResponse = createResponse()
  let firstError
  let secondNext = false

  limiter(
    { ip: '192.0.2.12' },
    firstResponse,
    (error) => { firstError = error },
  )
  limiter(
    { ip: '192.0.2.13' },
    secondResponse,
    () => { secondNext = true },
  )

  assert.equal(firstError, undefined)
  assert.equal(secondNext, true)
})

test('rate limiter rejects invalid configuration', () => {
  assert.throws(() => createRateLimit({ windowMs: 10, max: 1 }), TypeError)
  assert.throws(() => createRateLimit({ windowMs: 1000, max: 0 }), TypeError)
})

test('error handler maps malformed JSON and oversized payloads safely', () => {
  const malformedResponse = createResponse()
  errorHandler(
    { type: 'entity.parse.failed' },
    { method: 'POST', path: '/api/test' },
    malformedResponse,
    () => {},
  )

  assert.equal(malformedResponse.statusCode, 400)
  assert.equal(malformedResponse.body.code, 'INVALID_JSON')

  const oversizedResponse = createResponse()
  errorHandler(
    { type: 'entity.too.large' },
    { method: 'POST', path: '/api/test' },
    oversizedResponse,
    () => {},
  )

  assert.equal(oversizedResponse.statusCode, 413)
  assert.equal(oversizedResponse.body.code, 'PAYLOAD_TOO_LARGE')
})

test('error handler does not expose unexpected internal error details', () => {
  const response = createResponse()
  const originalError = new Error('MongoDB password=do-not-leak')

  errorHandler(
    originalError,
    { method: 'GET', path: '/api/private' },
    response,
    () => {},
  )

  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.body, {
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  })
  assert.equal(JSON.stringify(response.body).includes('do-not-leak'), false)
})

test('error handler maps duplicate-key conflicts to HTTP 409', () => {
  const response = createResponse()

  errorHandler(
    { code: 11000 },
    { method: 'POST', path: '/api/resources' },
    response,
    () => {},
  )

  assert.equal(response.statusCode, 409)
  assert.equal(response.body.code, 'DUPLICATE_RESOURCE')
})

test('access-token verification rejects a token signed with an unexpected algorithm', () => {
  const token = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', role: 'admin' },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS384',
      expiresIn: '5m',
      issuer: 'campusconnect-api',
      audience: 'campusconnect-client',
    },
  )

  assert.throws(() => verifyAccessToken(token))
})

test('access-token verification rejects the wrong audience', () => {
  const token = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', role: 'student' },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '5m',
      issuer: 'campusconnect-api',
      audience: 'another-client',
    },
  )

  assert.throws(() => verifyAccessToken(token))
})
