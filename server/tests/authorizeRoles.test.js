const test = require('node:test')
const assert = require('node:assert/strict')
const authorizeRoles = require('../src/middleware/authorizeRoles')
const ApiError = require('../src/utils/ApiError')

test('rejects an invalid configured role', () => {
  assert.throws(() => authorizeRoles('superadmin'), TypeError)
})

test('requires at least one allowed role', () => {
  assert.throws(() => authorizeRoles(), TypeError)
})

test('rejects a request without an authenticated user', () => {
  const middleware = authorizeRoles('admin')
  let receivedError

  middleware({}, {}, (error) => {
    receivedError = error
  })

  assert.ok(receivedError instanceof ApiError)
  assert.equal(receivedError.statusCode, 401)
  assert.equal(receivedError.code, 'AUTHENTICATION_REQUIRED')
})

test('denies a student access to an admin-only route', () => {
  const middleware = authorizeRoles('admin')
  let receivedError

  middleware({ user: { role: 'student' } }, {}, (error) => {
    receivedError = error
  })

  assert.ok(receivedError instanceof ApiError)
  assert.equal(receivedError.statusCode, 403)
  assert.equal(receivedError.code, 'FORBIDDEN')
})

test('allows an admin through an admin-only authorization check', () => {
  const middleware = authorizeRoles('admin')
  const user = { role: 'admin' }
  let nextCalled = false

  middleware({ user }, {}, (error) => {
    assert.equal(error, undefined)
    nextCalled = true
  })

  assert.equal(nextCalled, true)
})
