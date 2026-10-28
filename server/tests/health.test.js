const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const app = require('../src/app')

// Verify that the health endpoint responds with the expected JSON.
test('GET /api/v1/health returns a successful response', async (t) => {
  const server = app.listen(0, '127.0.0.1')

  await once(server, 'listening')

  // Close the temporary test server even if an assertion fails.
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
  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`)

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    message: 'CampusConnect API is running',
  })
})
