const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const app = require('../src/app')
const env = require('../src/config/env')
const { REFRESH_COOKIE_NAME } = require('../src/utils/authCookies')

async function withServer(t, callback) {
  let server
  let baseUrl

  // Retry if the operating system assigns a port rejected by fetch().
  for (let attempt = 0; attempt < 10; attempt += 1) {
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')

    const port = server.address().port

    try {
      // Node's fetch rejects certain reserved ports. A successful
      // request confirms that this port is usable.
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`)

      if (response.ok) {
        baseUrl = `http://127.0.0.1:${port}`
        break
      }
    } catch {
      // Retry if fetch rejects the randomly assigned port.
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    server = null
  }

  if (!server || !baseUrl) {
    throw new Error('Could not start a test server on a usable port.')
  }

  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      }),
  )

  await callback(baseUrl)
}

for (const endpoint of ['/login', '/refresh', '/logout']) {
  test(`${endpoint} rejects an untrusted origin`, async (t) => {
    await withServer(t, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth${endpoint}`, {
        method: 'POST',
        headers: {
          Origin: 'https://untrusted.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      })

      assert.equal(response.status, 403)
      assert.deepEqual(await response.json(), {
        success: false,
        message: 'Request origin is not allowed.',
        code: 'UNTRUSTED_ORIGIN',
      })
    })
  })
}

test('logout with a trusted origin clears the refresh cookie', async (t) => {
  await withServer(t, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Origin: env.CLIENT_ORIGIN,
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      success: true,
      message: 'Logged out successfully.',
    })

    const setCookie = response.headers.get('set-cookie')

    assert.ok(setCookie)
    assert.ok(setCookie.includes(`${REFRESH_COOKIE_NAME}=`))
    assert.ok(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/i.test(setCookie))
    assert.ok(setCookie.includes('Path=/api/v1/auth'))
    assert.ok(/HttpOnly/i.test(setCookie))
  })
})
