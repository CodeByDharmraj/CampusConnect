const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const service = require('../src/services/facultyCourseService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const FACULTY_ID = '507f1f77bcf86cd799439012'
const OFFERING_ID = '507f1f77bcf86cd799439013'

const sampleAssignment = {
  _id: '507f1f77bcf86cd799439014',
  facultyId: FACULTY_ID,
  courseOfferingId: OFFERING_ID,
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
    departmentId: role === 'coordinator' ? FACULTY_ID : null,
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
    createFacultyAssignment: async () => sampleAssignment,
    getFacultyAssignments: async () => [sampleAssignment],
    deactivateFacultyAssignment: async () => ({
      ...sampleAssignment,
      isActive: false,
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

test('course offering routes reject unauthenticated requests', async (t) => {
  const baseUrl = await withServer(t)

  const response = await fetch(
    `${baseUrl}/api/v1/course-offerings/${OFFERING_ID}/faculty`,
  )

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED')
})

test('student cannot create a faculty assignment', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('student'),
    {
      method: 'POST',
      body: JSON.stringify({ facultyId: FACULTY_ID }),
    },
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('administrator can create a faculty assignment', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUser
  let receivedOfferingId
  let receivedFacultyId

  mockService(t, {
    createFacultyAssignment: async (user, offeringId, facultyId) => {
      receivedUser = user
      receivedOfferingId = offeringId
      receivedFacultyId = facultyId
      return sampleAssignment
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({ facultyId: FACULTY_ID }),
    },
  )

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { assignment: sampleAssignment },
  })

  assert.equal(receivedUser.role, 'admin')
  assert.equal(receivedOfferingId, OFFERING_ID)
  assert.equal(receivedFacultyId, FACULTY_ID)
})

test('assignment creation rejects unexpected request fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        facultyId: FACULTY_ID,
        isActive: false,
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('assignment creation rejects an invalid offering ID', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings/invalid-id/faculty',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({ facultyId: FACULTY_ID }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('authorized faculty can list their assignments', async (t) => {
  mockAuthenticatedUser(t, 'faculty')

  let receivedOfferingId

  mockService(t, {
    getFacultyAssignments: async (_user, offeringId) => {
      receivedOfferingId = offeringId
      return [sampleAssignment]
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('faculty'),
  )

  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).data.assignments, [sampleAssignment])
  assert.equal(receivedOfferingId, OFFERING_ID)
})

test('student cannot list faculty assignments', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('student'),
  )

  assert.equal(response.status, 403)
})

test('student cannot deactivate a faculty assignment', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty/${FACULTY_ID}`,
    tokenFor('student'),
    { method: 'DELETE' },
  )

  assert.equal(response.status, 403)
})

test('administrator can deactivate a faculty assignment', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedOfferingId
  let receivedFacultyId

  mockService(t, {
    deactivateFacultyAssignment: async (_user, offeringId, facultyId) => {
      receivedOfferingId = offeringId
      receivedFacultyId = facultyId
      return { ...sampleAssignment, isActive: false }
    },
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty/${FACULTY_ID}`,
    tokenFor('admin'),
    { method: 'DELETE' },
  )

  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.assignment.isActive, false)
  assert.equal(receivedOfferingId, OFFERING_ID)
  assert.equal(receivedFacultyId, FACULTY_ID)
})

test('coordinator can access faculty assignment management routes', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')

  mockService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    `/api/v1/course-offerings/${OFFERING_ID}/faculty`,
    tokenFor('coordinator'),
  )

  assert.equal(response.status, 200)
})

const courseOfferingService = require('../src/services/courseOfferingService')

const sampleOffering = {
  _id: '507f1f77bcf86cd799439015',
  courseId: '507f1f77bcf86cd799439016',
  academicYear: '2026-2027',
  semester: 5,
  section: 'A',
  isActive: true,
}

const validOfferingInput = {
  courseId: '507f1f77bcf86cd799439016',
  academicYear: '2026-2027',
  semester: 5,
  section: 'A',
}

function mockOfferingService(t, implementation = async () => sampleOffering) {
  t.mock.method(courseOfferingService, 'createCourseOffering', implementation)
}

test('unauthenticated users cannot create course offerings', async (t) => {
  const baseUrl = await withServer(t)

  const response = await fetch(`${baseUrl}/api/v1/course-offerings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validOfferingInput),
  })

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED')
})

test('students cannot create course offerings', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockOfferingService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('student'),
    {
      method: 'POST',
      body: JSON.stringify(validOfferingInput),
    },
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('faculty cannot create course offerings', async (t) => {
  mockAuthenticatedUser(t, 'faculty')
  mockOfferingService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('faculty'),
    {
      method: 'POST',
      body: JSON.stringify(validOfferingInput),
    },
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('administrator can create a course offering', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUser
  let receivedInput

  mockOfferingService(t, async (user, input) => {
    receivedUser = user
    receivedInput = input
    return sampleOffering
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify(validOfferingInput),
    },
  )

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { offering: sampleOffering },
  })

  assert.equal(receivedUser.role, 'admin')
  assert.deepEqual(receivedInput, validOfferingInput)
})

test('coordinator can create a course offering', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')

  let receivedUser

  mockOfferingService(t, async (user) => {
    receivedUser = user
    return sampleOffering
  })

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('coordinator'),
    {
      method: 'POST',
      body: JSON.stringify(validOfferingInput),
    },
  )

  assert.equal(response.status, 201)
  assert.equal(receivedUser.role, 'coordinator')
  assert.deepEqual((await response.json()).data.offering, sampleOffering)
})

test('course offering creation rejects unexpected request fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockOfferingService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        ...validOfferingInput,
        isActive: false,
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('course offering creation rejects invalid academic year', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockOfferingService(t)

  const baseUrl = await withServer(t)

  const response = await request(
    baseUrl,
    '/api/v1/course-offerings',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        ...validOfferingInput,
        academicYear: '2026-2028',
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})
