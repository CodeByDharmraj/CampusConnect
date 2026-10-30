const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const { once } = require('node:events')
const User = require('../src/models/User')
const authenticate = require('../src/middleware/authenticate')
const errorHandler = require('../src/middleware/errorHandler')
const { createAccessToken } = require('../src/utils/authTokens')

async function withServer(t, handler = authenticate) {
  const app = express()

  app.get('/protected', handler, (req, res) => {
    res.status(200).json({
      success: true,
      userId: req.user.id,
    })
  })

  app.use(errorHandler)

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

  return `http://127.0.0.1:${server.address().port}`
}

test('protected route rejects a missing bearer token', async (t) => {
  const baseUrl = await withServer(t)
  const response = await fetch(`${baseUrl}/protected`)

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED')
})

test('protected route rejects a malformed token', async (t) => {
  const baseUrl = await withServer(t)
  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: 'Bearer not-a-jwt' },
  })

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'INVALID_ACCESS_TOKEN')
})

test('protected route rejects a token with an invalid signature', async (t) => {
  const baseUrl = await withServer(t)
  const validToken = createAccessToken({
    id: '507f1f77bcf86cd799439011',
    role: 'student',
  })
  const invalidToken = `${validToken}invalid`

  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  })

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'INVALID_ACCESS_TOKEN')
})

test('protected route rejects a nonexistent user', async (t) => {
  const originalFindById = User.findById
  User.findById = async () => null

  t.after(() => {
    User.findById = originalFindById
  })

  const baseUrl = await withServer(t)
  const token = createAccessToken({
    id: '507f1f77bcf86cd799439011',
    role: 'student',
  })

  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'INVALID_ACCESS_TOKEN')
})

test('protected route rejects an inactive user', async (t) => {
  const originalFindById = User.findById
  User.findById = async () => ({
    id: '507f1f77bcf86cd799439011',
    isActive: false,
  })

  t.after(() => {
    User.findById = originalFindById
  })

  const baseUrl = await withServer(t)
  const token = createAccessToken({
    id: '507f1f77bcf86cd799439011',
    role: 'student',
  })

  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'INVALID_ACCESS_TOKEN')
})

test('protected route attaches an active user to the request', async (t) => {
  const originalFindById = User.findById
  User.findById = async () => ({
    id: '507f1f77bcf86cd799439011',
    isActive: true,
    role: 'student',
  })

  t.after(() => {
    User.findById = originalFindById
  })

  const baseUrl = await withServer(t)
  const token = createAccessToken({
    id: '507f1f77bcf86cd799439011',
    role: 'student',
  })

  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    userId: '507f1f77bcf86cd799439011',
  })
})
