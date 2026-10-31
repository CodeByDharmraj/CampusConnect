const test = require('node:test')
const assert = require('node:assert/strict')

const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')
const Department = require('../src/models/Department')
const Enrollment = require('../src/models/Enrollment')
const FacultyCourse = require('../src/models/FacultyCourse')
const ApiError = require('../src/utils/ApiError')
const courseService = require('../src/services/courseService')

const DEPARTMENT_ID = '507f1f77bcf86cd799439011'
const OTHER_DEPARTMENT_ID = '507f191e810c19729de860ea'
const COURSE_ID = '507f1f77bcf86cd799439012'
const STUDENT_ID = '507f1f77bcf86cd799439013'
const FACULTY_ID = '507f1f77bcf86cd799439014'
const OFFERING_ID = '507f1f77bcf86cd799439015'

const admin = {
  _id: '507f1f77bcf86cd799439016',
  role: 'admin',
}

const coordinator = {
  _id: '507f1f77bcf86cd799439017',
  role: 'coordinator',
  departmentId: DEPARTMENT_ID,
}

const student = {
  _id: STUDENT_ID,
  role: 'student',
  departmentId: DEPARTMENT_ID,
}

const faculty = {
  _id: FACULTY_ID,
  role: 'faculty',
}

function createCourseDocument(overrides = {}) {
  return {
    _id: COURSE_ID,
    name: 'Database Management Systems',
    code: 'CS301',
    description: '',
    credits: 4,
    departmentId: DEPARTMENT_ID,
    isActive: true,
    save: async function () {
      return this
    },
    ...overrides,
  }
}

function mockCourseSave(t, implementation) {
  return t.mock.method(
    Course.prototype,
    'save',
    implementation ||
      async function () {
        return this
      },
  )
}

test('creates a course in an active department as admin', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne', async () => ({
    _id: DEPARTMENT_ID,
    isActive: true,
  }))

  mockCourseSave(t)

  const course = await courseService.createCourse(admin, {
    name: 'Database Management Systems',
    code: 'CS301',
    credits: 4,
    departmentId: DEPARTMENT_ID,
  })

  assert.equal(course.name, 'Database Management Systems')
  assert.equal(course.code, 'CS301')
  assert.equal(course.departmentId.toString(), DEPARTMENT_ID)
  assert.equal(course.isActive, true)

  assert.deepEqual(departmentLookup.mock.calls[0].arguments[0], {
    _id: DEPARTMENT_ID,
    isActive: true,
  })
})

test('creates a course in the coordinator assigned department', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne', async () => ({
    _id: DEPARTMENT_ID,
    isActive: true,
  }))

  mockCourseSave(t)

  const course = await courseService.createCourse(coordinator, {
    name: 'Operating Systems',
    code: 'CS302',
    credits: 4,
  })

  assert.equal(course.departmentId.toString(), DEPARTMENT_ID)
  assert.equal(departmentLookup.mock.callCount(), 1)
})

test('rejects unexpected fields during course creation', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne')
  const save = mockCourseSave(t)

  await assert.rejects(
    courseService.createCourse(admin, {
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      departmentId: DEPARTMENT_ID,
      isActive: false,
    }),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      assert.match(error.message, /isActive/)
      return true
    },
  )

  assert.equal(departmentLookup.mock.callCount(), 0)
  assert.equal(save.mock.callCount(), 0)
})

test('accepts all supported course creation fields', async (t) => {
  t.mock.method(Department, 'findOne', async () => ({
    _id: DEPARTMENT_ID,
    isActive: true,
  }))

  mockCourseSave(t)

  const course = await courseService.createCourse(admin, {
    name: 'Database Management Systems',
    code: 'CS301',
    description: 'Introduction to database systems',
    credits: 4,
    departmentId: DEPARTMENT_ID,
  })

  assert.equal(course.name, 'Database Management Systems')
  assert.equal(course.code, 'CS301')
  assert.equal(course.description, 'Introduction to database systems')
  assert.equal(course.credits, 4)
  assert.equal(course.isActive, true)
})

test('rejects a coordinator creating a course in another department', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne')
  const save = mockCourseSave(t)

  await assert.rejects(
    courseService.createCourse(coordinator, {
      name: 'Electronics',
      code: 'EC301',
      credits: 4,
      departmentId: OTHER_DEPARTMENT_ID,
    }),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 403)
      assert.equal(error.code, 'FORBIDDEN')
      return true
    },
  )

  assert.equal(departmentLookup.mock.callCount(), 0)
  assert.equal(save.mock.callCount(), 0)
})

test('rejects course creation in a missing or inactive department', async (t) => {
  t.mock.method(Department, 'findOne', async () => null)
  const save = mockCourseSave(t)

  await assert.rejects(
    courseService.createCourse(admin, {
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      departmentId: DEPARTMENT_ID,
    }),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'INVALID_DEPARTMENT')
      return true
    },
  )

  assert.equal(save.mock.callCount(), 0)
})

test('rejects invalid department IDs', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne')

  await assert.rejects(
    courseService.createCourse(admin, {
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      departmentId: 'invalid-id',
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )

  assert.equal(departmentLookup.mock.callCount(), 0)
})

test('rejects students and faculty from creating courses', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne')

  for (const user of [student, faculty]) {
    await assert.rejects(
      courseService.createCourse(user, {
        name: 'Database Management Systems',
        code: 'CS301',
        credits: 4,
        departmentId: DEPARTMENT_ID,
      }),
      (error) => {
        assert.equal(error.statusCode, 403)
        assert.equal(error.code, 'FORBIDDEN')
        return true
      },
    )
  }

  assert.equal(departmentLookup.mock.callCount(), 0)
})

test('converts duplicate course code errors into a conflict', async (t) => {
  mockCourseSave(t, async () => {
    const error = new Error('Duplicate key')
    error.code = 11000
    throw error
  })

  t.mock.method(Department, 'findOne', async () => ({
    _id: DEPARTMENT_ID,
    isActive: true,
  }))

  await assert.rejects(
    courseService.createCourse(admin, {
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      departmentId: DEPARTMENT_ID,
    }),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'COURSE_CODE_ALREADY_EXISTS')
      return true
    },
  )
})

test('returns all courses for an administrator', async (t) => {
  const courses = [createCourseDocument()]

  const find = t.mock.method(Course, 'find', async (filter) => {
    assert.deepEqual(filter, {})
    return courses
  })

  const result = await courseService.getCourses(admin)

  assert.deepEqual(result, courses)
  assert.equal(find.mock.callCount(), 1)
})

test('returns only department courses for a coordinator', async (t) => {
  const courses = [createCourseDocument()]

  const find = t.mock.method(Course, 'find', async (filter) => {
    assert.deepEqual(filter, { departmentId: DEPARTMENT_ID })
    return courses
  })

  const result = await courseService.getCourses(coordinator)

  assert.deepEqual(result, courses)
  assert.equal(find.mock.callCount(), 1)
})

test('returns historical courses for students regardless of enrollment status', async (t) => {
  const offerings = [OFFERING_ID]
  const courseIds = [COURSE_ID]
  const courses = [createCourseDocument({ isActive: false })]

  const enrollmentLookup = t.mock.method(
    Enrollment,
    'distinct',
    async (field, filter) => {
      assert.equal(field, 'courseOfferingId')
      assert.deepEqual(filter, { studentId: STUDENT_ID })
      return offerings
    },
  )

  const offeringLookup = t.mock.method(
    CourseOffering,
    'distinct',
    async (field, filter) => {
      assert.equal(field, 'courseId')
      assert.deepEqual(filter, { _id: { $in: offerings } })
      return courseIds
    },
  )

  const find = t.mock.method(Course, 'find', async (filter) => {
    assert.deepEqual(filter, { _id: { $in: courseIds } })
    return courses
  })

  const result = await courseService.getCourses(student)

  assert.deepEqual(result, courses)
  assert.equal(enrollmentLookup.mock.callCount(), 1)
  assert.equal(offeringLookup.mock.callCount(), 1)
  assert.equal(find.mock.callCount(), 1)
})

test('returns historical courses for faculty with inactive assignments', async (t) => {
  const offerings = [OFFERING_ID]
  const courseIds = [COURSE_ID]
  const courses = [createCourseDocument({ isActive: false })]

  const assignmentLookup = t.mock.method(
    FacultyCourse,
    'distinct',
    async (field, filter) => {
      assert.equal(field, 'courseOfferingId')
      assert.deepEqual(filter, { facultyId: FACULTY_ID })
      return offerings
    },
  )

  const offeringLookup = t.mock.method(
    CourseOffering,
    'distinct',
    async () => courseIds,
  )

  t.mock.method(Course, 'find', async () => courses)

  const result = await courseService.getCourses(faculty)

  assert.deepEqual(result, courses)
  assert.equal(assignmentLookup.mock.callCount(), 1)
  assert.equal(offeringLookup.mock.callCount(), 1)
})

test('returns an empty list when a student has no enrollment history', async (t) => {
  const enrollmentLookup = t.mock.method(Enrollment, 'distinct', async () => [])

  const offeringLookup = t.mock.method(CourseOffering, 'distinct')
  const courseLookup = t.mock.method(Course, 'find')

  const result = await courseService.getCourses(student)

  assert.deepEqual(result, [])
  assert.equal(enrollmentLookup.mock.callCount(), 1)
  assert.equal(offeringLookup.mock.callCount(), 0)
  assert.equal(courseLookup.mock.callCount(), 0)
})

test('returns an individual course to an administrator', async (t) => {
  const course = createCourseDocument()

  const findOne = t.mock.method(Course, 'findOne', async (filter) => {
    assert.deepEqual(filter, { _id: COURSE_ID })
    return course
  })

  const result = await courseService.getCourseById(admin, COURSE_ID)

  assert.equal(result, course)
  assert.equal(findOne.mock.callCount(), 1)
})

test('prevents a coordinator from viewing another department course', async (t) => {
  const findOne = t.mock.method(Course, 'findOne', async (filter) => {
    assert.deepEqual(filter, {
      _id: COURSE_ID,
      departmentId: DEPARTMENT_ID,
    })
    return null
  })

  await assert.rejects(
    courseService.getCourseById(coordinator, COURSE_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_NOT_FOUND')
      return true
    },
  )

  assert.equal(findOne.mock.callCount(), 1)
})

test('allows a student to view a course from historical enrollment', async (t) => {
  const course = createCourseDocument({ isActive: false })

  t.mock.method(Enrollment, 'distinct', async () => [OFFERING_ID])

  t.mock.method(CourseOffering, 'exists', async (filter) => {
    assert.deepEqual(filter, {
      _id: { $in: [OFFERING_ID] },
      courseId: COURSE_ID,
    })
    return { _id: OFFERING_ID }
  })

  const findOne = t.mock.method(Course, 'findOne', async () => course)

  const result = await courseService.getCourseById(student, COURSE_ID)

  assert.equal(result, course)
  assert.equal(findOne.mock.callCount(), 1)
})

test('prevents a student from viewing an unrelated course', async (t) => {
  t.mock.method(Enrollment, 'distinct', async () => [OFFERING_ID])
  t.mock.method(CourseOffering, 'exists', async () => null)

  const findOne = t.mock.method(Course, 'findOne')

  await assert.rejects(
    courseService.getCourseById(student, COURSE_ID),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_NOT_FOUND')
      return true
    },
  )

  assert.equal(findOne.mock.callCount(), 0)
})

test('updates permitted course fields within coordinator scope', async (t) => {
  const course = createCourseDocument()

  t.mock.method(Course, 'findOne', async (filter) => {
    assert.deepEqual(filter, {
      _id: COURSE_ID,
      departmentId: DEPARTMENT_ID,
    })
    return course
  })

  const save = t.mock.method(course, 'save', async function () {
    return this
  })

  const result = await courseService.updateCourse(coordinator, COURSE_ID, {
    name: 'Advanced Database Systems',
    credits: 5,
  })

  assert.equal(result.name, 'Advanced Database Systems')
  assert.equal(result.credits, 5)
  assert.equal(result.departmentId, DEPARTMENT_ID)
  assert.equal(save.mock.callCount(), 1)
})

test('rejects attempts to update protected course fields', async (t) => {
  const findOne = t.mock.method(Course, 'findOne')

  await assert.rejects(
    courseService.updateCourse(admin, COURSE_ID, {
      departmentId: OTHER_DEPARTMENT_ID,
    }),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )

  assert.equal(findOne.mock.callCount(), 0)
})

test('deactivates a course without deleting it', async (t) => {
  const course = createCourseDocument()

  t.mock.method(Course, 'findOne', async () => course)

  const save = t.mock.method(course, 'save', async function () {
    return this
  })

  const result = await courseService.deactivateCourse(admin, COURSE_ID)

  assert.equal(result.isActive, false)
  assert.equal(save.mock.callCount(), 1)
})

test('does not save a course that is already inactive', async (t) => {
  const course = createCourseDocument({ isActive: false })

  t.mock.method(Course, 'findOne', async () => course)

  const save = t.mock.method(Course.prototype, 'save')

  const result = await courseService.deactivateCourse(admin, COURSE_ID)

  assert.equal(result.isActive, false)
  assert.equal(save.mock.callCount(), 0)
})

test('rejects unauthenticated course access', async () => {
  await assert.rejects(courseService.getCourses(null), (error) => {
    assert.equal(error.statusCode, 401)
    assert.equal(error.code, 'AUTHENTICATION_REQUIRED')
    return true
  })
})

test('rejects malformed course IDs', async () => {
  await assert.rejects(
    courseService.getCourseById(admin, 'invalid-id'),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )
})
