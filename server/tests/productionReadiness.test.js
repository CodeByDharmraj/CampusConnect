const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const mongoose = require('mongoose')
const app = require('../src/app')

async function withServer(t, callback) {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')

  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      }),
  )

  await callback(`http://127.0.0.1:${server.address().port}`)
}

test('liveness endpoint is available without a database connection', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health/live`)

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      success: true,
      data: { status: 'alive' },
    })
  })
})

test('readiness endpoint reflects MongoDB connection state', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`)
    const databaseReady = mongoose.connection.readyState === 1

    assert.equal(response.status, databaseReady ? 200 : 503)
    assert.deepEqual(await response.json(), {
      success: databaseReady,
      data: {
        status: databaseReady ? 'ready' : 'not_ready',
        dependencies: {
          database: databaseReady ? 'connected' : 'unavailable',
        },
      },
    })
  })
})

test('API responses include security headers and omit X-Powered-By', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health/live`)

    assert.equal(response.headers.get('x-powered-by'), null)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.match(
      response.headers.get('content-security-policy') || '',
      /frame-ancestors 'none'/,
    )
  })
})

test('CORS does not grant credentials to an untrusted origin', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health/live`, {
      headers: { Origin: 'https://attacker.example' },
    })

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('access-control-allow-origin'), null)
    assert.notEqual(response.headers.get('access-control-allow-credentials'), 'true')
  })
})

test('JSON body parser rejects payloads above the configured limit', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: 'x'.repeat(12 * 1024) }),
    })

    assert.equal(response.status, 413)
    const payload = await response.json()
    assert.equal(payload.code, 'PAYLOAD_TOO_LARGE')
  })
})
