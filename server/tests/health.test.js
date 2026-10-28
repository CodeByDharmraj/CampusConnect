const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const app = require('../src/app')
const express = require('express')
const errorHandler = require('../src/middleware/errorHandler')
const notFound = require('../src/middleware/notFound')
const requestLogger = require('../src/middleware/requestLogger')

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
      path: '/api/v1/does-not-exist',
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
  })
})
