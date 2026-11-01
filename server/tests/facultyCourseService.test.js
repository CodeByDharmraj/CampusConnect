const test = require('node:test')
const assert = require('node:assert/strict')

const User = require('../src/models/User')
const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')
const FacultyCourse = require('../src/models/FacultyCourse')
const service = require('../src/services/facultyCourseService')

const ADMIN_ID = '507f1f77bcf86cd799439011'
const COORDINATOR_ID = '507f1f77bcf86cd799439012'
const FACULTY_ID = '507f1f77bcf86cd799439013'
const DEPARTMENT_ID = '507f1f77bcf86cd799439014'
const COURSE_ID = '507f1f77bcf86cd799439015'
const OFFERING_ID = '507f1f77bcf86cd799439016'

const admin = {
  _id: ADMIN_ID,
  role: 'admin',
}

const coordinator = {
  _id: COORDINATOR_ID,
  role: 'coordinator',
  departmentId: DEPARTMENT_ID,
}

const facultyUser = {
  _id: FACULTY_ID,
  role: 'faculty',
}

const student = {
  _id: FACULTY_ID,
  role: 'student',
}

function mockAuthorizedOffering(t, options = {}) {
  const offering = {
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: options.offeringActive ?? true,
  }

  const course = {
    _id: COURSE_ID,
    departmentId: options.departmentId || DEPARTMENT_ID,
    isActive: options.courseActive ?? true,
  }

  const offeringLookup = t.mock.method(
    CourseOffering,
    'findById',
    async () => offering,
  )

  const courseLookup =
    options.courseLookup ||
    t.mock.method(
      options.role === 'admin' ? Course : Course,
      options.role === 'coordinator' ? 'findOne' : 'findById',
      async () => course,
    )

  return { offering, course, offeringLookup, courseLookup }
}

function mockFaculty(t, options = {}) {
  return t.mock.method(User, 'findOne', async () =>
    options.active === false
      ? null
      : {
          _id: FACULTY_ID,
          role: 'faculty',
          isActive: true,
        },
  )
}

test('administrator can assign active faculty to an active offering', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })
  mockFaculty(t)

  t.mock.method(FacultyCourse, 'findOne', async () => null)

  const save = t.mock.method(
    FacultyCourse.prototype,
    'save',
    async function () {
      return this
    },
  )

  const assignment = await service.createFacultyAssignment(
    admin,
    OFFERING_ID,
    FACULTY_ID,
  )

  assert.equal(assignment.facultyId.toString(), FACULTY_ID)
  assert.equal(assignment.courseOfferingId.toString(), OFFERING_ID)
  assert.equal(assignment.isActive, true)
  assert.equal(save.mock.callCount(), 1)
})

test('coordinator can assign faculty within their own department', async (t) => {
  const offering = {
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: true,
  }

  t.mock.method(CourseOffering, 'findById', async () => offering)

  const courseLookup = t.mock.method(Course, 'findOne', async () => ({
    _id: COURSE_ID,
    departmentId: DEPARTMENT_ID,
    isActive: true,
  }))

  mockFaculty(t)
  t.mock.method(FacultyCourse, 'findOne', async () => null)
  t.mock.method(FacultyCourse.prototype, 'save', async function () {
    return this
  })

  await service.createFacultyAssignment(coordinator, OFFERING_ID, FACULTY_ID)

  assert.deepEqual(courseLookup.mock.calls[0].arguments[0], {
    _id: COURSE_ID,
    departmentId: DEPARTMENT_ID,
  })
})

test('coordinator cannot assign faculty to another department', async (t) => {
  t.mock.method(CourseOffering, 'findById', async () => ({
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: true,
  }))

  t.mock.method(Course, 'findOne', async () => null)

  const facultyLookup = t.mock.method(User, 'findOne')
  const save = t.mock.method(FacultyCourse.prototype, 'save')

  await assert.rejects(
    service.createFacultyAssignment(coordinator, OFFERING_ID, FACULTY_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_OFFERING_NOT_FOUND')
      return true
    },
  )

  assert.equal(facultyLookup.mock.callCount(), 0)
  assert.equal(save.mock.callCount(), 0)
})

test('rejects users who are not authorized managers', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  for (const user of [student, facultyUser]) {
    await assert.rejects(
      service.createFacultyAssignment(user, OFFERING_ID, FACULTY_ID),
      (error) => {
        assert.equal(error.statusCode, 403)
        assert.equal(error.code, 'FORBIDDEN')
        return true
      },
    )
  }

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('rejects unauthenticated assignment requests', async () => {
  await assert.rejects(
    service.createFacultyAssignment(null, OFFERING_ID, FACULTY_ID),
    (error) => {
      assert.equal(error.statusCode, 401)
      assert.equal(error.code, 'AUTHENTICATION_REQUIRED')
      return true
    },
  )
})

test('rejects invalid offering and faculty IDs', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  await assert.rejects(
    service.createFacultyAssignment(admin, 'invalid-id', FACULTY_ID),
    (error) => error.code === 'VALIDATION_ERROR',
  )

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, 'invalid-id'),
    (error) => error.code === 'VALIDATION_ERROR',
  )

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('rejects assignments to inactive offerings', async (t) => {
  mockAuthorizedOffering(t, {
    role: 'admin',
    offeringActive: false,
  })

  const facultyLookup = t.mock.method(User, 'findOne')

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => error.code === 'COURSE_OFFERING_INACTIVE',
  )

  assert.equal(facultyLookup.mock.callCount(), 0)
})

test('rejects assignments when the parent course is inactive', async (t) => {
  mockAuthorizedOffering(t, {
    role: 'admin',
    courseActive: false,
  })

  const facultyLookup = t.mock.method(User, 'findOne')

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => error.code === 'PARENT_COURSE_INACTIVE',
  )

  assert.equal(facultyLookup.mock.callCount(), 0)
})

test('rejects inactive or non-faculty accounts', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })
  mockFaculty(t, { active: false })

  const save = t.mock.method(FacultyCourse.prototype, 'save')

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'FACULTY_NOT_FOUND')
      return true
    },
  )

  assert.equal(save.mock.callCount(), 0)
})

test('rejects duplicate active assignments', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })
  mockFaculty(t)

  t.mock.method(FacultyCourse, 'findOne', async () => ({
    _id: '507f1f77bcf86cd799439017',
    isActive: true,
  }))

  const save = t.mock.method(FacultyCourse.prototype, 'save')

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => error.code === 'FACULTY_ASSIGNMENT_ALREADY_EXISTS',
  )

  assert.equal(save.mock.callCount(), 0)
})

test('converts a duplicate-key database race into a conflict', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })
  mockFaculty(t)
  t.mock.method(FacultyCourse, 'findOne', async () => null)

  t.mock.method(FacultyCourse.prototype, 'save', async () => {
    const error = new Error('Duplicate key')
    error.code = 11000
    throw error
  })

  await assert.rejects(
    service.createFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'FACULTY_ASSIGNMENT_ALREADY_EXISTS')
      return true
    },
  )
})

test('coordinator must have a valid department ID', async (t) => {
  const invalidCoordinator = {
    ...coordinator,
    departmentId: null,
  }

  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  await assert.rejects(
    service.createFacultyAssignment(
      invalidCoordinator,
      OFFERING_ID,
      FACULTY_ID,
    ),
    (error) => error.code === 'FORBIDDEN',
  )

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('deactivates an assignment without deleting its record', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })

  const assignment = {
    facultyId: FACULTY_ID,
    courseOfferingId: OFFERING_ID,
    isActive: true,
    save: async function () {
      return this
    },
  }

  const assignmentLookup = t.mock.method(
    FacultyCourse,
    'findOne',
    async () => assignment,
  )

  const save = t.mock.method(assignment, 'save', async function () {
    return this
  })

  const result = await service.deactivateFacultyAssignment(
    admin,
    OFFERING_ID,
    FACULTY_ID,
  )

  assert.equal(result.isActive, false)
  assert.equal(assignmentLookup.mock.callCount(), 1)
  assert.equal(save.mock.callCount(), 1)
})

test('returns not found when no active assignment exists to deactivate', async (t) => {
  mockAuthorizedOffering(t, { role: 'admin' })

  t.mock.method(FacultyCourse, 'findOne', async () => null)

  await assert.rejects(
    service.deactivateFacultyAssignment(admin, OFFERING_ID, FACULTY_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'FACULTY_ASSIGNMENT_NOT_FOUND')
      return true
    },
  )
})

test('faculty can view only their own active assignment', async (t) => {
  t.mock.method(CourseOffering, 'findById', async () => ({
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: true,
  }))

  t.mock.method(Course, 'findById', async () => ({
    _id: COURSE_ID,
    isActive: true,
  }))

  t.mock.method(FacultyCourse, 'exists', async () => ({ _id: 'assignment' }))

  const query = {
    populate() {
      return this
    },
    sort() {
      return Promise.resolve([])
    },
  }

  const lookup = t.mock.method(FacultyCourse, 'find', () => query)

  await service.getFacultyAssignments(facultyUser, OFFERING_ID)

  assert.deepEqual(lookup.mock.calls[0].arguments[0], {
    courseOfferingId: OFFERING_ID,
    facultyId: FACULTY_ID,
    isActive: true,
  })
})

test('does not expose assignments to an unrelated faculty member', async (t) => {
  t.mock.method(CourseOffering, 'findById', async () => ({
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: true,
  }))

  t.mock.method(Course, 'findById', async () => ({
    _id: COURSE_ID,
    isActive: true,
  }))

  t.mock.method(FacultyCourse, 'exists', async () => null)

  const lookup = t.mock.method(FacultyCourse, 'find')

  await assert.rejects(
    service.getFacultyAssignments(facultyUser, OFFERING_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_OFFERING_NOT_FOUND')
      return true
    },
  )

  assert.equal(lookup.mock.callCount(), 0)
})
