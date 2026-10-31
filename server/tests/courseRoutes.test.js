const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const courseService = require('../src/services/courseService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const DEPARTMENT_ID = '507f1f77bcf86cd799439012'
const COURSE_ID = '507f1f77bcf86cd799439013'

const validCourseInput = {
  name: 'Data Structures',
  code: 'CS201',
  description: 'Fundamental data structures',
  credits: 4,
  departmentId: DEPARTMENT_ID,
}

const sampleCourse = {
  _id: COURSE_ID,
  ...validCourseInput,
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

  t.mock.method(User, 'findById', async (id) => {
    assert.equal(id, USER_ID)
    return user
  })

  return user
}

function mockCourseService(t, overrides = {}) {
  const defaults = {
    createCourse: async () => sampleCourse,
    getCourses: async () => [sampleCourse],
    getCourseById: async () => sampleCourse,
    updateCourse: async () => sampleCourse,
    deactivateCourse: async () => ({ ...sampleCourse, isActive: false }),
  }

  for (const [method, implementation] of Object.entries({
    ...defaults,
    ...overrides,
  })) {
    t.mock.method(courseService, method, implementation)
  }
}

async function request(baseUrl, path, token, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

function tokenFor(role) {
  return createAccessToken({
    id: USER_ID,
    role,
  })
}

test('course routes reject requests without authentication', async (t) => {
  const baseUrl = await withServer(t)

  const response = await fetch(`${baseUrl}/api/v1/courses`)

  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED')
})

test('student cannot create a course', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('student'),
    {
      method: 'POST',
      body: JSON.stringify(validCourseInput),
    },
  )

  assert.equal(response.status, 403)
  assert.equal((await response.json()).code, 'FORBIDDEN')
})

test('administrator can create a course', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUser
  let receivedInput

  mockCourseService(t, {
    createCourse: async (user, input) => {
      receivedUser = user
      receivedInput = input
      return sampleCourse
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify(validCourseInput),
    },
  )

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { course: sampleCourse },
  })
  assert.equal(receivedUser.role, 'admin')
  assert.deepEqual(receivedInput, validCourseInput)
})

test('coordinator can create a course using validated input', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')

  let receivedInput

  mockCourseService(t, {
    createCourse: async (user, input) => {
      receivedInput = input
      return sampleCourse
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('coordinator'),
    {
      method: 'POST',
      body: JSON.stringify({
        ...validCourseInput,
        code: ' cs201 ',
      }),
    },
  )

  assert.equal(response.status, 201)
  assert.equal(receivedInput.code, 'CS201')
})

test('course creation rejects unexpected fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('admin'),
    {
      method: 'POST',
      body: JSON.stringify({
        ...validCourseInput,
        isActive: false,
      }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('authenticated student can list visible courses', async (t) => {
  mockAuthenticatedUser(t, 'student')

  let receivedRole

  mockCourseService(t, {
    getCourses: async (user) => {
      receivedRole = user.role
      return [sampleCourse]
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('student'),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { courses: [sampleCourse] },
  })
  assert.equal(receivedRole, 'student')
})

test('authenticated faculty can list visible courses', async (t) => {
  mockAuthenticatedUser(t, 'faculty')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('faculty'),
  )

  assert.equal(response.status, 200)
})

test('authenticated coordinator can list visible courses', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses',
    tokenFor('coordinator'),
  )

  assert.equal(response.status, 200)
})

test('administrator can list visible courses', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(baseUrl, '/api/v1/courses', tokenFor('admin'))

  assert.equal(response.status, 200)
})

test('course detail rejects an invalid course ID', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    '/api/v1/courses/not-a-valid-id',
    tokenFor('student'),
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('course detail returns the service result', async (t) => {
  mockAuthenticatedUser(t, 'student')

  let receivedCourseId

  mockCourseService(t, {
    getCourseById: async (user, courseId) => {
      receivedCourseId = courseId
      return sampleCourse
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}`,
    tokenFor('student'),
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { course: sampleCourse },
  })
  assert.equal(receivedCourseId, COURSE_ID)
})

test('student cannot update a course', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}`,
    tokenFor('student'),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Course' }),
    },
  )

  assert.equal(response.status, 403)
})

test('administrator can update permitted course fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedUpdates

  mockCourseService(t, {
    updateCourse: async (user, courseId, updates) => {
      receivedUpdates = updates
      return { ...sampleCourse, ...updates }
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}`,
    tokenFor('admin'),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Advanced Data Structures' }),
    },
  )

  assert.equal(response.status, 200)
  assert.equal(
    (await response.json()).data.course.name,
    'Advanced Data Structures',
  )
  assert.deepEqual(receivedUpdates, {
    name: 'Advanced Data Structures',
  })
})

test('course update rejects protected fields', async (t) => {
  mockAuthenticatedUser(t, 'admin')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}`,
    tokenFor('admin'),
    {
      method: 'PATCH',
      body: JSON.stringify({ departmentId: DEPARTMENT_ID }),
    },
  )

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'VALIDATION_ERROR')
})

test('student cannot deactivate a course', async (t) => {
  mockAuthenticatedUser(t, 'student')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}/deactivate`,
    tokenFor('student'),
    { method: 'PATCH' },
  )

  assert.equal(response.status, 403)
})

test('administrator can deactivate a course', async (t) => {
  mockAuthenticatedUser(t, 'admin')

  let receivedCourseId

  mockCourseService(t, {
    deactivateCourse: async (user, courseId) => {
      receivedCourseId = courseId
      return { ...sampleCourse, isActive: false }
    },
  })

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}/deactivate`,
    tokenFor('admin'),
    { method: 'PATCH' },
  )

  assert.equal(response.status, 200)
  assert.equal((await response.json()).data.course.isActive, false)
  assert.equal(receivedCourseId, COURSE_ID)
})

test('coordinator can access management routes through role middleware', async (t) => {
  mockAuthenticatedUser(t, 'coordinator')
  mockCourseService(t)

  const baseUrl = await withServer(t)
  const response = await request(
    baseUrl,
    `/api/v1/courses/${COURSE_ID}`,
    tokenFor('coordinator'),
    {
      method: 'PATCH',
      body: JSON.stringify({ credits: 3 }),
    },
  )

  assert.equal(response.status, 200)
})
