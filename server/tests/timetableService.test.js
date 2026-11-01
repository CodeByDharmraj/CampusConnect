const test = require('node:test')
const assert = require('node:assert/strict')

const User = require('../src/models/User')
const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')
const Enrollment = require('../src/models/Enrollment')
const FacultyCourse = require('../src/models/FacultyCourse')
const TimetableEntry = require('../src/models/TimetableEntry')
const ApiError = require('../src/utils/ApiError')
const service = require('../src/services/timetableService')

const ADMIN_ID = '507f1f77bcf86cd799439011'
const COORDINATOR_ID = '507f1f77bcf86cd799439012'
const FACULTY_ID = '507f1f77bcf86cd799439013'
const OFFERING_ID = '507f1f77bcf86cd799439014'
const COURSE_ID = '507f1f77bcf86cd799439015'
const ENTRY_ID = '507f1f77bcf86cd799439016'
const DEPARTMENT_ID = '507f1f77bcf86cd799439017'

const admin = {
  _id: ADMIN_ID,
  role: 'admin',
}

const coordinator = {
  _id: COORDINATOR_ID,
  role: 'coordinator',
  departmentId: DEPARTMENT_ID,
}

const faculty = {
  _id: FACULTY_ID,
  role: 'faculty',
}

const student = {
  _id: ADMIN_ID,
  role: 'student',
}

const validInput = {
  courseOfferingId: OFFERING_ID,
  facultyId: FACULTY_ID,
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  room: 'CSE-101',
  mode: 'offline',
}

const offering = {
  _id: OFFERING_ID,
  courseId: COURSE_ID,
  isActive: true,
}

const course = {
  _id: COURSE_ID,
  departmentId: DEPARTMENT_ID,
  isActive: true,
}

const activeFaculty = {
  _id: FACULTY_ID,
  role: 'faculty',
  isActive: true,
}

const activeAssignment = {
  facultyId: FACULTY_ID,
  courseOfferingId: OFFERING_ID,
  isActive: true,
}

function assertApiError(error, statusCode, code) {
  assert.ok(error instanceof ApiError)
  assert.equal(error.statusCode, statusCode)
  assert.equal(error.code, code)
  return true
}

/**
 * Creates the standard database mocks needed for timetable creation.
 */
function mockValidCreation(t, options = {}) {
  const courseOffering =
    options.offering === undefined ? offering : options.offering

  const parentCourse = options.course === undefined ? course : options.course

  const facultyMember =
    options.faculty === undefined ? activeFaculty : options.faculty

  const assignment =
    options.assignment === undefined ? activeAssignment : options.assignment

  t.mock.method(CourseOffering, 'findById', async () => courseOffering)

  t.mock.method(Course, 'findOne', async () => parentCourse)

  t.mock.method(User, 'findOne', async () => facultyMember)

  t.mock.method(FacultyCourse, 'findOne', async () => assignment)

  const conflictLookup = t.mock.method(
    TimetableEntry,
    'findOne',
    async () => null,
  )

  const save = t.mock.method(
    TimetableEntry.prototype,
    'save',
    async function () {
      return this
    },
  )

  return {
    conflictLookup,
    save,
  }
}

/**
 * Mocks a Mongoose query that supports:
 * select().lean()
 */
function mockSelectQuery(result) {
  return {
    select() {
      return this
    },
    lean: async () => result,
  }
}

/**
 * Mocks a Mongoose timetable query that supports:
 * populate().populate().sort().lean()
 */
function mockTimetableQuery(result) {
  return {
    populate() {
      return this
    },
    sort() {
      return this
    },
    lean: async () => result,
  }
}

function mockTimetableEntryQuery(result) {
  return {
    populate() {
      return this
    },
    lean: async () => result,
  }
}

function mockExistingEntryOperation(t, options = {}) {
  const entry = {
    _id: ENTRY_ID,
    courseOfferingId: OFFERING_ID,
    facultyId: FACULTY_ID,
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: 'CSE-101',
    mode: 'offline',
    isActive: true,
    ...(options.entry || {}),
  }

  const save = t.mock.fn(async function () {
    return this
  })

  entry.save = save

  t.mock.method(CourseOffering, 'findById', async () => offering)

  t.mock.method(Course, 'findOne', async () => course)

  t.mock.method(User, 'findOne', async () => activeFaculty)

  t.mock.method(FacultyCourse, 'findOne', async () => activeAssignment)

  let timetableFindOneCallCount = 0

  const findOne = t.mock.method(TimetableEntry, 'findOne', async () => {
    timetableFindOneCallCount += 1

    // First call retrieves the existing timetable entry.
    // The next three calls check faculty, room and offering conflicts.
    if (timetableFindOneCallCount === 1) {
      return entry
    }

    return null
  })

  return {
    entry,
    save,
    findOne,
  }
}

// -----------------------------------------------------------------------------
// Authentication and authorization
// -----------------------------------------------------------------------------

test('rejects unauthenticated timetable access', async () => {
  await assert.rejects(service.getTimetableEntries(null), (error) =>
    assertApiError(error, 401, 'AUTHENTICATION_REQUIRED'),
  )
})

test('rejects unsupported roles from timetable access', async () => {
  await assert.rejects(
    service.getTimetableEntries({
      _id: ADMIN_ID,
      role: 'unknown',
    }),
    (error) => assertApiError(error, 403, 'FORBIDDEN'),
  )
})

test('rejects unauthenticated timetable creation', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  await assert.rejects(
    service.createTimetableEntry(null, validInput),
    (error) => assertApiError(error, 401, 'AUTHENTICATION_REQUIRED'),
  )

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('rejects timetable creation by students and faculty', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  for (const user of [student, faculty]) {
    await assert.rejects(
      service.createTimetableEntry(user, validInput),
      (error) => assertApiError(error, 403, 'FORBIDDEN'),
    )
  }

  assert.equal(offeringLookup.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Creation validation
// -----------------------------------------------------------------------------

test('rejects invalid timetable creation input', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  const invalidInputs = [
    null,
    undefined,
    [],
    {},
    {
      ...validInput,
      unexpected: true,
    },
    {
      ...validInput,
      room: undefined,
    },
  ]

  for (const input of invalidInputs) {
    await assert.rejects(service.createTimetableEntry(admin, input), (error) =>
      assertApiError(error, 400, 'VALIDATION_ERROR'),
    )
  }

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('rejects invalid offering and faculty IDs', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  await assert.rejects(
    service.createTimetableEntry(admin, {
      ...validInput,
      courseOfferingId: 'invalid-id',
    }),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  await assert.rejects(
    service.createTimetableEntry(admin, {
      ...validInput,
      facultyId: 'invalid-id',
    }),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  assert.equal(offeringLookup.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Successful creation
// -----------------------------------------------------------------------------

test('administrator can create a valid timetable entry', async (t) => {
  const mocks = mockValidCreation(t)

  const entry = await service.createTimetableEntry(admin, validInput)

  assert.equal(entry.courseOfferingId.toString(), OFFERING_ID)
  assert.equal(entry.facultyId.toString(), FACULTY_ID)
  assert.equal(entry.dayOfWeek, 1)
  assert.equal(entry.startTime, '09:00')
  assert.equal(entry.endTime, '10:00')
  assert.equal(entry.room, 'CSE-101')
  assert.equal(entry.mode, 'offline')
  assert.equal(entry.isActive, true)

  assert.equal(mocks.conflictLookup.mock.callCount(), 3)
  assert.equal(mocks.save.mock.callCount(), 1)
})

test('coordinator can create an entry in their own department', async (t) => {
  mockValidCreation(t)

  const entry = await service.createTimetableEntry(coordinator, validInput)

  assert.equal(entry.courseOfferingId.toString(), OFFERING_ID)
})

test('rejects coordinators without a valid department assignment', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  await assert.rejects(
    service.createTimetableEntry(
      {
        _id: COORDINATOR_ID,
        role: 'coordinator',
      },
      validInput,
    ),
    (error) => assertApiError(error, 403, 'FORBIDDEN'),
  )

  assert.equal(offeringLookup.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Offering, course and faculty validation
// -----------------------------------------------------------------------------

test('rejects creation when the course offering does not exist', async (t) => {
  const mocks = mockValidCreation(t, {
    offering: null,
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 404, 'COURSE_OFFERING_NOT_FOUND'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects creation when the parent course is inactive', async (t) => {
  const mocks = mockValidCreation(t, {
    course: {
      ...course,
      isActive: false,
    },
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'PARENT_COURSE_INACTIVE'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('returns 404 when the parent course does not exist', async (t) => {
  const mocks = mockValidCreation(t, {
    course: null,
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 404, 'COURSE_OFFERING_NOT_FOUND'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects creation when the course offering is inactive', async (t) => {
  const mocks = mockValidCreation(t, {
    offering: {
      ...offering,
      isActive: false,
    },
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'COURSE_OFFERING_INACTIVE'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects inactive or missing faculty accounts', async (t) => {
  const mocks = mockValidCreation(t, {
    faculty: null,
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 404, 'FACULTY_NOT_FOUND'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects faculty without an active course offering assignment', async (t) => {
  const mocks = mockValidCreation(t, {
    assignment: null,
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'FACULTY_ASSIGNMENT_REQUIRED'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Schedule conflict detection
// -----------------------------------------------------------------------------

test('rejects a faculty schedule conflict', async (t) => {
  const mocks = mockValidCreation(t)

  mocks.conflictLookup.mock.mockImplementation(async (filter) => {
    if (filter.facultyId === FACULTY_ID) {
      return {
        _id: ENTRY_ID,
      }
    }

    return null
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'FACULTY_SCHEDULE_CONFLICT'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects a room schedule conflict', async (t) => {
  const mocks = mockValidCreation(t)

  mocks.conflictLookup.mock.mockImplementation(async (filter) => {
    if (filter.room === validInput.room) {
      return {
        _id: ENTRY_ID,
      }
    }

    return null
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'ROOM_SCHEDULE_CONFLICT'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects a course offering schedule conflict', async (t) => {
  const mocks = mockValidCreation(t)

  mocks.conflictLookup.mock.mockImplementation(async (filter) => {
    if (filter.courseOfferingId === OFFERING_ID) {
      return {
        _id: ENTRY_ID,
      }
    }

    return null
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'COURSE_SCHEDULE_CONFLICT'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('checks conflicts using the same day and overlapping interval', async (t) => {
  const mocks = mockValidCreation(t)

  await service.createTimetableEntry(admin, validInput)

  const filters = mocks.conflictLookup.mock.calls.map(
    (call) => call.arguments[0],
  )

  assert.equal(filters.length, 3)

  for (const filter of filters) {
    assert.equal(filter.dayOfWeek, validInput.dayOfWeek)
    assert.equal(filter.isActive, true)

    assert.deepEqual(filter.startTime, {
      $lt: validInput.endTime,
    })

    assert.deepEqual(filter.endTime, {
      $gt: validInput.startTime,
    })
  }
})

test('ignores inactive timetable entries during conflict checks', async (t) => {
  const mocks = mockValidCreation(t)

  await service.createTimetableEntry(admin, validInput)

  for (const call of mocks.conflictLookup.mock.calls) {
    assert.equal(call.arguments[0].isActive, true)
  }
})

test('rejects overlapping sessions even when their start times differ', async (t) => {
  const mocks = mockValidCreation(t)

  mocks.conflictLookup.mock.mockImplementation(async (filter) => {
    if (filter.facultyId === FACULTY_ID) {
      return {
        _id: ENTRY_ID,
        startTime: '09:30',
        endTime: '10:30',
      }
    }

    return null
  })

  await assert.rejects(
    service.createTimetableEntry(admin, validInput),
    (error) => assertApiError(error, 409, 'FACULTY_SCHEDULE_CONFLICT'),
  )
})

// -----------------------------------------------------------------------------
// Role-based timetable visibility
// -----------------------------------------------------------------------------

test('administrator can retrieve all active timetable entries', async (t) => {
  const entries = [
    {
      _id: ENTRY_ID,
      isActive: true,
    },
  ]

  const find = t.mock.method(TimetableEntry, 'find', (filter) => {
    assert.deepEqual(filter, {
      isActive: true,
    })

    return mockTimetableQuery(entries)
  })

  const result = await service.getTimetableEntries(admin)

  assert.deepEqual(result, entries)
  assert.equal(find.mock.callCount(), 1)
})

test('coordinator retrieves only active offerings in their department', async (t) => {
  const courseIds = [COURSE_ID]
  const offeringIds = [OFFERING_ID]
  const entries = [
    {
      _id: ENTRY_ID,
    },
  ]

  const courseFind = t.mock.method(Course, 'find', (filter) => {
    assert.deepEqual(filter, {
      departmentId: DEPARTMENT_ID,
      isActive: true,
    })

    return mockSelectQuery(courseIds.map((_id) => ({ _id })))
  })

  const offeringFind = t.mock.method(CourseOffering, 'find', (filter) => {
    assert.deepEqual(filter, {
      courseId: {
        $in: courseIds,
      },
      isActive: true,
    })

    return mockSelectQuery(offeringIds.map((_id) => ({ _id })))
  })

  const timetableFind = t.mock.method(TimetableEntry, 'find', (filter) => {
    assert.deepEqual(filter, {
      isActive: true,
      courseOfferingId: {
        $in: offeringIds,
      },
    })

    return mockTimetableQuery(entries)
  })

  const result = await service.getTimetableEntries(coordinator)

  assert.deepEqual(result, entries)
  assert.equal(courseFind.mock.callCount(), 1)
  assert.equal(offeringFind.mock.callCount(), 1)
  assert.equal(timetableFind.mock.callCount(), 1)
})

test('faculty retrieves only actively assigned offerings', async (t) => {
  const assignments = [
    {
      courseOfferingId: OFFERING_ID,
    },
  ]

  const offerings = [
    {
      _id: OFFERING_ID,
      courseId: COURSE_ID,
    },
  ]

  const entries = [
    {
      _id: ENTRY_ID,
    },
  ]

  t.mock.method(FacultyCourse, 'find', (filter) => {
    assert.deepEqual(filter, {
      facultyId: FACULTY_ID,
      isActive: true,
    })

    return mockSelectQuery(assignments)
  })

  t.mock.method(CourseOffering, 'find', (filter) => {
    assert.deepEqual(filter, {
      _id: {
        $in: [OFFERING_ID],
      },
      isActive: true,
    })

    return mockSelectQuery(offerings)
  })

  t.mock.method(Course, 'find', (filter) => {
    assert.deepEqual(filter, {
      _id: {
        $in: [COURSE_ID],
      },
      isActive: true,
    })

    return mockSelectQuery([
      {
        _id: COURSE_ID,
      },
    ])
  })

  const timetableFind = t.mock.method(TimetableEntry, 'find', (filter) => {
    assert.deepEqual(filter, {
      isActive: true,
      courseOfferingId: {
        $in: [OFFERING_ID],
      },
    })

    return mockTimetableQuery(entries)
  })

  const result = await service.getTimetableEntries(faculty)

  assert.deepEqual(result, entries)
  assert.equal(timetableFind.mock.callCount(), 1)
})

test('student retrieves only actively enrolled offerings', async (t) => {
  const enrollments = [
    {
      courseOfferingId: OFFERING_ID,
    },
  ]

  const offerings = [
    {
      _id: OFFERING_ID,
      courseId: COURSE_ID,
    },
  ]

  const entries = [
    {
      _id: ENTRY_ID,
    },
  ]

  t.mock.method(Enrollment, 'find', (filter) => {
    assert.deepEqual(filter, {
      studentId: ADMIN_ID,
      status: 'enrolled',
    })

    return mockSelectQuery(enrollments)
  })

  t.mock.method(CourseOffering, 'find', (filter) => {
    assert.deepEqual(filter, {
      _id: {
        $in: [OFFERING_ID],
      },
      isActive: true,
    })

    return mockSelectQuery(offerings)
  })

  t.mock.method(Course, 'find', (filter) => {
    assert.deepEqual(filter, {
      _id: {
        $in: [COURSE_ID],
      },
      isActive: true,
    })

    return mockSelectQuery([
      {
        _id: COURSE_ID,
      },
    ])
  })

  const timetableFind = t.mock.method(TimetableEntry, 'find', (filter) => {
    assert.deepEqual(filter, {
      isActive: true,
      courseOfferingId: {
        $in: [OFFERING_ID],
      },
    })

    return mockTimetableQuery(entries)
  })

  const result = await service.getTimetableEntries(student)

  assert.deepEqual(result, entries)
  assert.equal(timetableFind.mock.callCount(), 1)
})

test('faculty with no active assignments receives an empty timetable', async (t) => {
  t.mock.method(FacultyCourse, 'find', () => mockSelectQuery([]))

  const timetableFind = t.mock.method(TimetableEntry, 'find')

  const result = await service.getTimetableEntries(faculty)

  assert.deepEqual(result, [])
  assert.equal(timetableFind.mock.callCount(), 0)
})

test('student with no active enrollments receives an empty timetable', async (t) => {
  t.mock.method(Enrollment, 'find', () => mockSelectQuery([]))

  const timetableFind = t.mock.method(TimetableEntry, 'find')

  const result = await service.getTimetableEntries(student)

  assert.deepEqual(result, [])
  assert.equal(timetableFind.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Individual timetable entry retrieval
// -----------------------------------------------------------------------------

test('administrator can retrieve an individual active timetable entry', async (t) => {
  const entry = {
    _id: ENTRY_ID,
    courseOfferingId: offering,
    facultyId: activeFaculty,
    isActive: true,
  }

  const findOne = t.mock.method(TimetableEntry, 'findOne', (filter) => {
    assert.deepEqual(filter, {
      _id: ENTRY_ID,
      isActive: true,
    })

    return mockTimetableEntryQuery(entry)
  })

  const result = await service.getTimetableEntry(admin, ENTRY_ID)

  assert.equal(result, entry)
  assert.equal(findOne.mock.callCount(), 1)
})

test('coordinator can retrieve an entry from their own department', async (t) => {
  const entry = {
    _id: ENTRY_ID,
    courseOfferingId: offering,
    isActive: true,
  }

  t.mock.method(Course, 'find', () => mockSelectQuery([{ _id: COURSE_ID }]))

  t.mock.method(CourseOffering, 'find', () =>
    mockSelectQuery([{ _id: OFFERING_ID }]),
  )

  const findOne = t.mock.method(TimetableEntry, 'findOne', (filter) => {
    assert.deepEqual(filter, {
      _id: ENTRY_ID,
      isActive: true,
      courseOfferingId: {
        $in: [OFFERING_ID],
      },
    })

    return mockTimetableEntryQuery(entry)
  })

  const result = await service.getTimetableEntry(coordinator, ENTRY_ID)

  assert.equal(result, entry)
  assert.equal(findOne.mock.callCount(), 1)
})

test('coordinator cannot retrieve an entry outside their department', async (t) => {
  t.mock.method(Course, 'find', () => mockSelectQuery([]))

  const findOne = t.mock.method(TimetableEntry, 'findOne')

  await assert.rejects(
    service.getTimetableEntry(coordinator, ENTRY_ID),
    (error) => assertApiError(error, 404, 'TIMETABLE_ENTRY_NOT_FOUND'),
  )

  assert.equal(findOne.mock.callCount(), 0)
})

test('student cannot retrieve an entry for an offering they are not enrolled in', async (t) => {
  t.mock.method(Enrollment, 'find', () => mockSelectQuery([]))

  const findOne = t.mock.method(TimetableEntry, 'findOne')

  await assert.rejects(service.getTimetableEntry(student, ENTRY_ID), (error) =>
    assertApiError(error, 404, 'TIMETABLE_ENTRY_NOT_FOUND'),
  )

  assert.equal(findOne.mock.callCount(), 0)
})

test('returns not found when an active timetable entry does not exist', async (t) => {
  const findOne = t.mock.method(TimetableEntry, 'findOne', () =>
    mockTimetableEntryQuery(null),
  )

  await assert.rejects(service.getTimetableEntry(admin, ENTRY_ID), (error) =>
    assertApiError(error, 404, 'TIMETABLE_ENTRY_NOT_FOUND'),
  )

  assert.equal(findOne.mock.callCount(), 1)
})

test('rejects an invalid timetable entry ID before querying the database', async (t) => {
  const findOne = t.mock.method(TimetableEntry, 'findOne')

  await assert.rejects(
    service.getTimetableEntry(admin, 'invalid-id'),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  assert.equal(findOne.mock.callCount(), 0)
})

// -----------------------------------------------------------------------------
// Individual timetable entry updates
// -----------------------------------------------------------------------------

test('administrator can update an active timetable entry', async (t) => {
  const mocks = mockExistingEntryOperation(t)

  const result = await service.updateTimetableEntry(admin, ENTRY_ID, {
    startTime: '10:00',
    endTime: '11:00',
    room: 'CSE-202',
  })

  assert.equal(result, mocks.entry)
  assert.equal(result.startTime, '10:00')
  assert.equal(result.endTime, '11:00')
  assert.equal(result.room, 'CSE-202')
  assert.equal(mocks.save.mock.callCount(), 1)
  assert.equal(mocks.findOne.mock.callCount(), 4)
})

test('coordinator can update an entry in their own department', async (t) => {
  const mocks = mockExistingEntryOperation(t)

  const result = await service.updateTimetableEntry(coordinator, ENTRY_ID, {
    room: 'CSE-303',
  })

  assert.equal(result.room, 'CSE-303')
  assert.equal(mocks.save.mock.callCount(), 1)
})

test('coordinator cannot update an entry outside their department', async (t) => {
  const mocks = mockExistingEntryOperation(t)

  t.mock.method(Course, 'findOne', async () => null)

  await assert.rejects(
    service.updateTimetableEntry(coordinator, ENTRY_ID, {
      room: 'CSE-303',
    }),
    (error) => assertApiError(error, 404, 'COURSE_OFFERING_NOT_FOUND'),
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects a partial update that creates an invalid final time range', async (t) => {
  const mocks = mockExistingEntryOperation(t)

  await assert.rejects(
    service.updateTimetableEntry(admin, ENTRY_ID, {
      startTime: '10:30',
    }),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  // One query retrieves the existing entry.
  assert.equal(mocks.findOne.mock.callCount(), 1)

  // The invalid update must never be saved.
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects an empty timetable update before querying the database', async (t) => {
  const findOne = t.mock.method(TimetableEntry, 'findOne')

  await assert.rejects(
    service.updateTimetableEntry(admin, ENTRY_ID, {}),
    (error) => assertApiError(error, 400, 'VALIDATION_ERROR'),
  )

  assert.equal(findOne.mock.callCount(), 0)
})

test('update conflict checks exclude the current timetable entry', async (t) => {
  const mocks = mockExistingEntryOperation(t)

  await service.updateTimetableEntry(admin, ENTRY_ID, {
    room: 'CSE-202',
  })

  const conflictCalls = mocks.findOne.mock.calls.slice(1)

  assert.equal(conflictCalls.length, 3)

  for (const call of conflictCalls) {
    assert.deepEqual(call.arguments[0]._id, {
      $ne: ENTRY_ID,
    })
  }
})
