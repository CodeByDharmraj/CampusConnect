const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')

const {
  createCourseOffering,
} = require('../src/services/courseOfferingService')

const USER_ID = new mongoose.Types.ObjectId()
const COURSE_ID = new mongoose.Types.ObjectId()
const DEPARTMENT_ID = new mongoose.Types.ObjectId()

const VALID_INPUT = {
  courseId: COURSE_ID.toString(),
  academicYear: '2026-2027',
  semester: 5,
  section: 'A',
}

function createUser(role, overrides = {}) {
  return {
    _id: USER_ID,
    role,
    departmentId: role === 'coordinator' ? DEPARTMENT_ID : null,
    ...overrides,
  }
}

function mockCourseSave(
  t,
  implementation = async function () {
    return this
  },
) {
  t.mock.method(CourseOffering.prototype, 'save', implementation)
}

test('administrator can create an active course offering', async (t) => {
  const course = {
    _id: COURSE_ID,
    isActive: true,
  }

  t.mock.method(Course, 'findById', async (id) => {
    assert.equal(id.toString(), COURSE_ID.toString())
    return course
  })

  let savedOffering
  mockCourseSave(t, async function () {
    savedOffering = this
    return this
  })

  const result = await createCourseOffering(createUser('admin'), VALID_INPUT)

  assert.equal(result, savedOffering)
  assert.equal(result.courseId.toString(), COURSE_ID.toString())
  assert.equal(result.academicYear, '2026-2027')
  assert.equal(result.semester, 5)
  assert.equal(result.section, 'A')
  assert.equal(result.isActive, true)
})

test('coordinator can create an offering for a course in their department', async (t) => {
  const course = {
    _id: COURSE_ID,
    isActive: true,
  }

  t.mock.method(Course, 'findOne', async (filter) => {
    assert.equal(filter._id.toString(), COURSE_ID.toString())
    assert.equal(filter.departmentId.toString(), DEPARTMENT_ID.toString())
    return course
  })

  mockCourseSave(t)

  const result = await createCourseOffering(
    createUser('coordinator'),
    VALID_INPUT,
  )

  assert.equal(result.courseId.toString(), COURSE_ID.toString())
  assert.equal(result.isActive, true)
})

test('coordinator cannot create an offering outside their department', async (t) => {
  t.mock.method(Course, 'findOne', async (filter) => {
    assert.equal(filter.departmentId.toString(), DEPARTMENT_ID.toString())
    return null
  })

  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(createUser('coordinator'), VALID_INPUT),
    {
      statusCode: 404,
      code: 'COURSE_NOT_FOUND',
    },
  )
})

test('coordinator without a valid department is rejected', async (t) => {
  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(
      createUser('coordinator', { departmentId: null }),
      VALID_INPUT,
    ),
    {
      statusCode: 403,
      code: 'FORBIDDEN',
    },
  )
})

test('student cannot create a course offering', async (t) => {
  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(createUser('student'), VALID_INPUT),
    {
      statusCode: 403,
      code: 'FORBIDDEN',
    },
  )
})

test('faculty cannot create a course offering', async (t) => {
  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(createUser('faculty'), VALID_INPUT),
    {
      statusCode: 403,
      code: 'FORBIDDEN',
    },
  )
})

test('missing user is rejected', async (t) => {
  mockCourseSave(t)

  await assert.rejects(createCourseOffering(null, VALID_INPUT), {
    statusCode: 401,
    code: 'AUTHENTICATION_REQUIRED',
  })
})

test('inactive parent course cannot receive a new offering', async (t) => {
  t.mock.method(Course, 'findById', async () => ({
    _id: COURSE_ID,
    isActive: false,
  }))

  mockCourseSave(t)

  await assert.rejects(createCourseOffering(createUser('admin'), VALID_INPUT), {
    statusCode: 409,
    code: 'PARENT_COURSE_INACTIVE',
  })
})

test('nonexistent course is rejected', async (t) => {
  t.mock.method(Course, 'findById', async () => null)
  mockCourseSave(t)

  await assert.rejects(createCourseOffering(createUser('admin'), VALID_INPUT), {
    statusCode: 404,
    code: 'COURSE_NOT_FOUND',
  })
})

test('invalid course ID is rejected', async (t) => {
  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(createUser('admin'), {
      ...VALID_INPUT,
      courseId: 'invalid-id',
    }),
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    },
  )
})

test('service rejects unexpected input fields', async (t) => {
  mockCourseSave(t)

  await assert.rejects(
    createCourseOffering(createUser('admin'), {
      ...VALID_INPUT,
      isActive: false,
    }),
    {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    },
  )
})

test('duplicate offering is translated into a conflict error', async (t) => {
  t.mock.method(Course, 'findById', async () => ({
    _id: COURSE_ID,
    isActive: true,
  }))

  mockCourseSave(t, async function () {
    const error = new Error('Duplicate key')
    error.code = 11000
    throw error
  })

  await assert.rejects(createCourseOffering(createUser('admin'), VALID_INPUT), {
    statusCode: 409,
    code: 'COURSE_OFFERING_ALREADY_EXISTS',
  })
})
