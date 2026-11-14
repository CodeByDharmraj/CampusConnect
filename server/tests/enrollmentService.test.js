const test = require('node:test')
const assert = require('node:assert/strict')

const User = require('../src/models/User')
const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')
const Enrollment = require('../src/models/Enrollment')
const ApiError = require('../src/utils/ApiError')
const service = require('../src/services/enrollmentService')

const STUDENT_ID = '507f1f77bcf86cd799439011'
const OFFERING_ID = '507f1f77bcf86cd799439012'
const ENROLLMENT_ID = '507f1f77bcf86cd799439013'
const ADMIN_ID = '507f1f77bcf86cd799439014'

const admin = {
  _id: ADMIN_ID,
  role: 'admin',
}

const studentUser = {
  _id: STUDENT_ID,
  role: 'student',
  isActive: true,
}

const offering = {
  _id: OFFERING_ID,
  courseId: '507f1f77bcf86cd799439015',
  isActive: true,
}

const course = {
  _id: offering.courseId,
  isActive: true,
}

const enrollmentInput = {
  studentId: STUDENT_ID,
  courseOfferingId: OFFERING_ID,
}

function mockValidCreation(t, options = {}) {
  const student = options.student === undefined ? studentUser : options.student
  const courseOffering =
    options.offering === undefined ? offering : options.offering
  const parentCourse = options.course === undefined ? course : options.course
  const existingEnrollment = options.existing || null

  const studentLookup = t.mock.method(User, 'findOne', async () => student)

  const offeringLookup = t.mock.method(
    CourseOffering,
    'findOne',
    async () => courseOffering,
  )

  const courseLookup = t.mock.method(
    Course,
    'findOne',
    async () => parentCourse,
  )

  const enrollmentLookup = t.mock.method(
    Enrollment,
    'findOne',
    async () => existingEnrollment,
  )

  const save = t.mock.method(Enrollment.prototype, 'save', async function () {
    return this
  })

  return {
    studentLookup,
    offeringLookup,
    courseLookup,
    enrollmentLookup,
    save,
  }
}

function assertApiError(error, statusCode, code) {
  assert.ok(error instanceof ApiError)
  assert.equal(error.statusCode, statusCode)
  assert.equal(error.code, code)
  return true
}

test('rejects unauthenticated enrollment management', async (t) => {
  const studentLookup = t.mock.method(User, 'findOne')

  await assert.rejects(
    service.createEnrollment(null, enrollmentInput),
    (error) => assertApiError(error, 401, 'AUTHENTICATION_REQUIRED'),
  )

  assert.equal(studentLookup.mock.callCount(), 0)
})

test('rejects enrollment management by non-administrators', async (t) => {
  const studentLookup = t.mock.method(User, 'findOne')

  await assert.rejects(
    service.createEnrollment(studentUser, enrollmentInput),
    (error) => assertApiError(error, 403, 'FORBIDDEN'),
  )

  assert.equal(studentLookup.mock.callCount(), 0)
})

test('rejects invalid enrollment input', async (t) => {
  const studentLookup = t.mock.method(User, 'findOne')

  for (const input of [
    null,
    undefined,
    [],
    {},
    { studentId: STUDENT_ID },
    { ...enrollmentInput, unexpected: true },
  ]) {
    await assert.rejects(service.createEnrollment(admin, input), (error) =>
      assertApiError(error, 400, 'VALIDATION_ERROR'),
    )
  }

  assert.equal(studentLookup.mock.callCount(), 0)
})

test('rejects invalid student and offering IDs', async (t) => {
  const studentLookup = t.mock.method(User, 'findOne')

  await assert.rejects(
    service.createEnrollment(admin, {
      studentId: 'invalid-id',
      courseOfferingId: OFFERING_ID,
    }),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  await assert.rejects(
    service.createEnrollment(admin, {
      studentId: STUDENT_ID,
      courseOfferingId: 'invalid-id',
    }),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  assert.equal(studentLookup.mock.callCount(), 0)
})

test('creates an enrollment for an active student and offering', async (t) => {
  const mocks = mockValidCreation(t)

  const enrollment = await service.createEnrollment(admin, enrollmentInput)

  assert.equal(enrollment.studentId.toString(), STUDENT_ID)
  assert.equal(enrollment.courseOfferingId.toString(), OFFERING_ID)
  assert.equal(enrollment.status, 'enrolled')

  assert.deepEqual(mocks.studentLookup.mock.calls[0].arguments[0], {
    _id: STUDENT_ID,
    role: 'student',
    isActive: true,
  })

  assert.deepEqual(mocks.offeringLookup.mock.calls[0].arguments[0], {
    _id: OFFERING_ID,
    isActive: true,
  })

  assert.deepEqual(mocks.courseLookup.mock.calls[0].arguments[0], {
    _id: offering.courseId,
    isActive: true,
  })

  assert.equal(mocks.enrollmentLookup.mock.callCount(), 1)
  assert.equal(mocks.save.mock.callCount(), 1)
})

test('rejects enrollment when the student is not active or does not exist', async (t) => {
  const mocks = mockValidCreation(t, { student: null })

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 404, 'STUDENT_NOT_FOUND'),
  )

  assert.equal(mocks.offeringLookup.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects enrollment when the offering is inactive or missing', async (t) => {
  const mocks = mockValidCreation(t, { offering: null })

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 404, 'COURSE_OFFERING_NOT_FOUND'),
  )

  assert.equal(mocks.courseLookup.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects enrollment when the parent course is inactive', async (t) => {
  const mocks = mockValidCreation(t, {
    course: null,
  })

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 409, 'PARENT_COURSE_INACTIVE'),
  )

  assert.equal(mocks.enrollmentLookup.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects a student who is already enrolled', async (t) => {
  const mocks = mockValidCreation(t, {
    existing: {
      _id: ENROLLMENT_ID,
      status: 'enrolled',
    },
  })

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 409, 'STUDENT_ALREADY_ENROLLED'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('reactivates a previously withdrawn enrollment', async (t) => {
  const mocks = mockValidCreation(t, {
    existing: {
      _id: ENROLLMENT_ID,
      status: 'withdrawn',
    },
  })

  const reactivated = {
    _id: ENROLLMENT_ID,
    status: 'enrolled',
  }

  const update = t.mock.method(
    Enrollment,
    'findOneAndUpdate',
    async () => reactivated,
  )

  const result = await service.createEnrollment(admin, enrollmentInput)

  assert.equal(result.status, 'enrolled')

  assert.deepEqual(update.mock.calls[0].arguments[0], {
    _id: ENROLLMENT_ID,
    status: 'withdrawn',
  })

  assert.deepEqual(update.mock.calls[0].arguments[1], {
    $set: { status: 'enrolled' },
  })

  assert.deepEqual(update.mock.calls[0].arguments[2], {
    new: true,
    runValidators: true,
  })

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects reactivation when enrollment is already completed', async (t) => {
  const mocks = mockValidCreation(t, {
    existing: {
      _id: ENROLLMENT_ID,
      status: 'completed',
    },
  })

  const update = t.mock.method(Enrollment, 'findOneAndUpdate')

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 409, 'ENROLLMENT_ALREADY_COMPLETED'),
  )

  assert.equal(update.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('converts duplicate database key errors into enrollment conflicts', async (t) => {
  const mocks = mockValidCreation(t)

  const duplicateError = new Error('Duplicate key')
  duplicateError.code = 11000

  mocks.save.mock.mockImplementation(async () => {
    throw duplicateError
  })

  await assert.rejects(
    service.createEnrollment(admin, enrollmentInput),
    (error) => assertApiError(error, 409, 'ENROLLMENT_ALREADY_EXISTS'),
  )
})

test('withdraws an active enrollment', async (t) => {
  const withdrawn = {
    _id: ENROLLMENT_ID,
    status: 'withdrawn',
  }

  const update = t.mock.method(
    Enrollment,
    'findOneAndUpdate',
    async () => withdrawn,
  )

  const result = await service.withdrawEnrollment(admin, ENROLLMENT_ID)

  assert.equal(result.status, 'withdrawn')

  assert.deepEqual(update.mock.calls[0].arguments[0], {
    _id: ENROLLMENT_ID,
    status: 'enrolled',
  })

  assert.deepEqual(update.mock.calls[0].arguments[1], {
    $set: { status: 'withdrawn' },
  })
})

test('rejects withdrawal when enrollment does not exist', async (t) => {
  t.mock.method(Enrollment, 'findOneAndUpdate', async () => null)
  t.mock.method(Enrollment, 'findById', async () => null)

  await assert.rejects(
    service.withdrawEnrollment(admin, ENROLLMENT_ID),
    (error) => assertApiError(error, 404, 'ENROLLMENT_NOT_FOUND'),
  )
})

test('rejects withdrawal of an enrollment that is not active', async (t) => {
  t.mock.method(Enrollment, 'findOneAndUpdate', async () => null)
  t.mock.method(Enrollment, 'findById', async () => ({
    _id: ENROLLMENT_ID,
    status: 'completed',
  }))

  await assert.rejects(
    service.withdrawEnrollment(admin, ENROLLMENT_ID),
    (error) => assertApiError(error, 409, 'ENROLLMENT_NOT_ACTIVE'),
  )
})

test('rejects invalid enrollment IDs during withdrawal', async (t) => {
  const update = t.mock.method(Enrollment, 'findOneAndUpdate')

  await assert.rejects(
    service.withdrawEnrollment(admin, 'invalid-id'),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  assert.equal(update.mock.callCount(), 0)
})
