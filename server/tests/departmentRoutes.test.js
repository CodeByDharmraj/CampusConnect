const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const departmentService = require('../src/services/departmentService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const DEPARTMENT_ID = '507f1f77bcf86cd799439012'

const sampleDepartment = {
  _id: DEPARTMENT_ID,
  name: 'Computer Science and Engineering',
  code: 'CSE',
  description: 'Computer Science department',
  isActive: true,
}

async function withServer(t) {
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

function mockAuthenticatedUser(t, role = 'admin') {
  const user = {
    _id: USER_ID,
    id: USER_ID,
    role,
    isActive: true,
    departmentId: role === 'coordinator' ? DEPARTMENT_ID : null,
  }

  t.mock.method(User, 'findById', async () => user)

  return user
}

function tokenFor(role) {
  return createAccessToken({
    id: USER_ID,
    role,
  })
}

async function request(baseUrl, path, token, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

test('department routes reject unauthenticated requests', async (t) => {
  const baseUrl = await withServer(t)

  const response = await fetch(`${baseUrl}/api/v1/departments`)

  assert.equal(response.status, 401)
})

test('administrator can create a department', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedInput

  t.mock.method(departmentService, 'createDepartment', async (user, input) => {
    receivedInput = input
    assert.equal(user.role, 'admin')
    return sampleDepartment
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        name: ' Computer Science and Engineering ',
        code: ' cse ',
        description: 'Computer Science department',
      }),
    },
  )

  assert.equal(response.status, 201)

  const body = await response.json()

  assert.deepEqual(body, {
    success: true,
    data: { department: sampleDepartment },
  })

  assert.deepEqual(receivedInput, {
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Computer Science department',
  })
})

test('coordinator cannot create a department', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('coordinator'),
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Computer Science',
        code: 'CSE',
      }),
    },
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('students cannot list departments', async (t) => {
  mockAuthenticatedUser(t, 'student')

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('student'),
  )

  assert.equal(response.status, 403)
})

test('faculty cannot list departments', async (t) => {
  mockAuthenticatedUser(t, 'faculty')

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('faculty'),
  )

  assert.equal(response.status, 403)
})

test('administrator can list departments', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  t.mock.method(departmentService, 'getDepartments', async () => [
    sampleDepartment,
  ])

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('admin'),
  )

  assert.equal(response.status, 200)

  assert.deepEqual(await response.json(), {
    success: true,
    data: { departments: [sampleDepartment] },
  })
})

test('coordinator can list departments through the scoped service', async (t) => {
  const user = mockAuthenticatedUser(t, 'coordinator')

  let receivedUser

  t.mock.method(
    departmentService,
    'getDepartments',
    async (authenticatedUser) => {
      receivedUser = authenticatedUser
      return [sampleDepartment]
    },
  )

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('coordinator'),
  )

  assert.equal(response.status, 200)
  assert.equal(receivedUser._id, user._id)
  assert.equal(receivedUser.departmentId, DEPARTMENT_ID)
})

test('department creation rejects unexpected fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/departments',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Computer Science',
        code: 'CSE',
        isActive: false,
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})
