const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const app = require('../src/app')
const express = require('express')
const errorHandler = require('../src/middleware/errorHandler')
const notFound = require('../src/middleware/notFound')
const requestLogger = require('../src/middleware/requestLogger')
const ApiError = require('../src/utils/ApiError')
const asyncHandler = require('../src/utils/asyncHandler')

async function withServer(t, runAssertions) {
  const server = app.listen(0, '127.0.0.1')

  await once(server, 'listening')

  t.after(() => {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  await runAssertions(baseUrl)
}

test('GET /api/v1/health returns a successful response', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`)

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      success: true,
      message: 'CampusConnect API is running',
      data: {
        status: 'ok',
      },
    })
  })
})

test('an unknown route returns a consistent 404 response', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/does-not-exist`)

    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), {
      success: false,
      message: 'Route not found',
      code: 'RESOURCE_NOT_FOUND',
    })
  })
})

test('unexpected errors return a generic 500 response', async (t) => {
  const testApp = express()

  testApp.use(requestLogger)

  testApp.get('/test-error', () => {
    throw new Error('Internal database details')
  })

  testApp.use(notFound)
  testApp.use(errorHandler)

  const server = testApp.listen(0, '127.0.0.1')
  await once(server, 'listening')

  t.after(() => {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/test-error`)

  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  })
})

test('ApiError preserves a valid HTTP status and error code', () => {
  const error = new ApiError(404, 'Course not found', 'COURSE_NOT_FOUND')

  assert.equal(error.statusCode, 404)
  assert.equal(error.message, 'Course not found')
  assert.equal(error.code, 'COURSE_NOT_FOUND')
  assert.equal(error.name, 'ApiError')
})

test('ApiError rejects an invalid HTTP status', () => {
  assert.throws(
    () => new ApiError(200, 'Invalid status', 'INVALID_STATUS'),
    TypeError,
  )
})

test('asyncHandler forwards rejected promises to next', async () => {
  const expectedError = new Error('Test failure')
  let receivedError

  const handler = asyncHandler(async () => {
    throw expectedError
  })

  await handler({}, {}, (error) => {
    receivedError = error
  })

  assert.equal(receivedError, expectedError)
})
