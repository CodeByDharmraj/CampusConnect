const test = require('node:test')
const assert = require('node:assert/strict')
const authorizeResource = require('../src/middleware/authorizeResource')
const ApiError = require('../src/utils/ApiError')

function createRequest({
  user = { id: 'student-1', role: 'student' },
  params = { id: 'resource-1' },
} = {}) {
  return { user, params }
}

async function runMiddleware(middleware, req) {
  let receivedError
  let nextCalled = false

  await middleware(req, {}, (error) => {
    receivedError = error
    nextCalled = !error
  })

  return { error: receivedError, nextCalled }
}

test('requires a resource loader', () => {
  assert.throws(
    () => authorizeResource({ canAccess: async () => true }),
    TypeError,
  )
})

test('requires a resource policy', () => {
  assert.throws(
    () => authorizeResource({ loadResource: async () => ({}) }),
    TypeError,
  )
})

test('requires a valid resource parameter name', () => {
  assert.throws(
    () =>
      authorizeResource({
        loadResource: async () => ({}),
        canAccess: async () => true,
        resourceParam: '',
      }),
    TypeError,
  )
})

test('rejects requests without an authenticated user', async () => {
  const middleware = authorizeResource({
    loadResource: async () => ({ id: 'resource-1' }),
    canAccess: async () => true,
  })

  const { error } = await runMiddleware(
    middleware,
    createRequest({ user: null }),
  )

  assert.ok(error instanceof ApiError)
  assert.equal(error.statusCode, 401)
  assert.equal(error.code, 'AUTHENTICATION_REQUIRED')
})

test('rejects a missing resource identifier', async () => {
  const middleware = authorizeResource({
    loadResource: async () => ({ id: 'resource-1' }),
    canAccess: async () => true,
  })

  const { error } = await runMiddleware(
    middleware,
    createRequest({ params: {} }),
  )

  assert.equal(error.statusCode, 400)
  assert.equal(error.code, 'INVALID_RESOURCE_ID')
})

test('returns not found when the resource does not exist', async () => {
  const middleware = authorizeResource({
    loadResource: async () => null,
    canAccess: async () => true,
  })

  const { error } = await runMiddleware(middleware, createRequest())

  assert.equal(error.statusCode, 404)
  assert.equal(error.code, 'RESOURCE_NOT_FOUND')
})

test('denies access when the resource policy returns false', async () => {
  const middleware = authorizeResource({
    loadResource: async () => ({ id: 'resource-1' }),
    canAccess: async () => false,
  })

  const { error } = await runMiddleware(middleware, createRequest())

  assert.equal(error.statusCode, 403)
  assert.equal(error.code, 'FORBIDDEN')
})

test('denies access when the resource policy does not return true', async () => {
  const middleware = authorizeResource({
    loadResource: async () => ({ id: 'resource-1' }),
    canAccess: async () => undefined,
  })

  const { error } = await runMiddleware(middleware, createRequest())

  assert.equal(error.statusCode, 403)
  assert.equal(error.code, 'FORBIDDEN')
})

test('allows access and attaches the authorized resource', async () => {
  const resource = { id: 'resource-1', ownerId: 'student-1' }

  const middleware = authorizeResource({
    loadResource: async (id) => {
      assert.equal(id, 'resource-1')
      return resource
    },
    canAccess: async ({ user, resource: loadedResource }) =>
      user.id === loadedResource.ownerId,
  })

  const req = createRequest()
  const { error, nextCalled } = await runMiddleware(middleware, req)

  assert.equal(error, undefined)
  assert.equal(nextCalled, true)
  assert.equal(req.resource, resource)
})

test('supports asynchronous resource loading and policy checks', async () => {
  const middleware = authorizeResource({
    loadResource: async () => {
      await Promise.resolve()
      return { id: 'resource-1' }
    },
    canAccess: async ({ user }) => {
      await Promise.resolve()
      return user.role === 'student'
    },
  })

  const { error, nextCalled } = await runMiddleware(middleware, createRequest())

  assert.equal(error, undefined)
  assert.equal(nextCalled, true)
})
