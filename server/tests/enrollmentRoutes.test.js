const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const service = require('../src/services/enrollmentService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const STUDENT_ID = '507f1f77bcf86cd799439012'
const OFFERING_ID = '507f1f77bcf86cd799439013'
const ENROLLMENT_ID = '507f1f77bcf86cd799439014'

const sampleEnrollment = {
  _id: ENROLLMENT_ID,
  studentId: STUDENT_ID,
  courseOfferingId: OFFERING_ID,
  status: 'enrolled',
}

const sampleOffering = {
  _id: OFFERING_ID,
  courseId: {
    _id: '507f1f77bcf86cd799439015',
    name: 'Data Structures',
    code: 'CSE201',
  },
  academicYear: '2026-2027',
  semester: 3,
  section: 'A',
  isActive: true,
}

const sampleStudent = {
  _id: STUDENT_ID,
  name: 'Test Student',
  email: 'student@example.com',
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
    departmentId: role === 'coordinator' ? STUDENT_ID : null,
  }

  t.mock.method(User, 'findById', async (id) => {
    assert.equal(id, USER_ID)
    return user
  })

  return user
}

function tokenFor(role) {
  return createAccessToken({
    id: USER_ID,
    role,
  })
}

function mockService(t, overrides = {}) {
  const defaults = {
    getEnrollmentOptions: async () => ({
      students: [sampleStudent],
      offerings: [sampleOffering],
    }),

    getOfferingEnrollments: async () => ({
      offering: sampleOffering,
      enrollments: [sampleEnrollment],
    }),

    createEnrollment: async () => sampleEnrollment,

    withdrawEnrollment: async () => ({
      ...sampleEnrollment,
      status: 'withdrawn',
    }),
  }

  for (const [method, implementation] of Object.entries({
    ...defaults,
    ...overrides,
  })) {
    t.mock.method(service, method, implementation)
  }
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

test('enrollment routes reject unauthenticated requests', async (t) => {
  const baseUrl = await withServer(t)

  const response = await fetch(`${baseUrl}/api/v1/enrollments/options`)

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED')
})

test('student cannot access enrollment management routes', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments/options',
    tokenFor('student'),
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('faculty cannot access enrollment management routes', async (t) => {
  mockAuthenticatedUser(t, 'faculty')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments/options',
    tokenFor('faculty'),
  )

  assert.equal(response.status, 403)
})

test('administrator can retrieve enrollment options', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUser

  mockService(t, {
    getEnrollmentOptions: async (user) => {
      receivedUser = user

      return {
        students: [sampleStudent],
        offerings: [sampleOffering],
      }
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments/options',
    tokenFor('admin'),
  )

  assert.equal(response.status, 200)

  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      students: [sampleStudent],
      offerings: [sampleOffering],
    },
  })

  assert.equal(receivedUser.role, 'admin')
})

test('administrator can retrieve an offering enrollment roster', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedOfferingId

  mockService(t, {
    getOfferingEnrollments: async (_user, offeringId) => {
      receivedOfferingId = offeringId

      return {
        offering: sampleOffering,
        enrollments: [sampleEnrollment],
      }
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/enrollments/offerings/${OFFERING_ID}`,
    tokenFor('admin'),
  )

  assert.equal(response.status, 200)

  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      offering: sampleOffering,
      enrollments: [sampleEnrollment],
    },
  })

  assert.equal(receivedOfferingId, OFFERING_ID)
})

test('roster retrieval rejects an invalid offering ID', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments/offerings/invalid-id',
    tokenFor('admin'),
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('administrator can create a student enrollment', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUser
  let receivedInput

  mockService(t, {
    createEnrollment: async (user, input) => {
      receivedUser = user
      receivedInput = input

      return sampleEnrollment
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        studentId: STUDENT_ID,
        courseOfferingId: OFFERING_ID,
      }),
    },
  )

  assert.equal(response.status, 201)

  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      enrollment: sampleEnrollment,
    },
  })

  assert.equal(receivedUser.role, 'admin')

  assert.deepEqual(receivedInput, {
    studentId: STUDENT_ID,
    courseOfferingId: OFFERING_ID,
  })
})

test('enrollment creation rejects unexpected request fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        studentId: STUDENT_ID,
        courseOfferingId: OFFERING_ID,
        status: 'completed',
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('administrator can withdraw an enrollment', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedEnrollmentId

  mockService(t, {
    withdrawEnrollment: async (_user, enrollmentId) => {
      receivedEnrollmentId = enrollmentId

      return {
        ...sampleEnrollment,
        status: 'withdrawn',
      }
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/enrollments/${ENROLLMENT_ID}`,
    tokenFor('admin'),
    { method: 'DELETE' },
  )

  assert.equal(response.status, 200)

  assert.equal((await response.json()).data.enrollment.status, 'withdrawn')

  assert.equal(receivedEnrollmentId, ENROLLMENT_ID)
})

test('withdrawal rejects an invalid enrollment ID', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/enrollments/invalid-id',
    tokenFor('admin'),
    { method: 'DELETE' },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})
