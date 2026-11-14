const test = require('node:test')
const assert = require('node:assert/strict')

const Course = require('../src/models/Course')
const CourseOffering = require('../src/models/CourseOffering')
const CourseOfferingReactivationRequest = require('../src/models/CourseOfferingReactivationRequest')
const ApiError = require('../src/utils/ApiError')
const service = require('../src/services/courseOfferingReactivationService')

const DEPARTMENT_ID = '507f1f77bcf86cd799439011'
const COURSE_ID = '507f1f77bcf86cd799439012'
const OFFERING_ID = '507f1f77bcf86cd799439015'
const COORDINATOR_ID = '507f1f77bcf86cd799439017'

const coordinator = {
  _id: COORDINATOR_ID,
  role: 'coordinator',
  departmentId: DEPARTMENT_ID,
}

const admin = {
  _id: '507f1f77bcf86cd799439016',
  role: 'admin',
}

const student = {
  _id: '507f1f77bcf86cd799439013',
  role: 'student',
  departmentId: DEPARTMENT_ID,
}

const validReason = 'The offering is required for continuing students.'
const mongoose = require('mongoose')

function createOffering(overrides = {}) {
  return {
    _id: OFFERING_ID,
    courseId: COURSE_ID,
    isActive: false,
    ...overrides,
  }
}

function createCourse(overrides = {}) {
  return {
    _id: COURSE_ID,
    departmentId: DEPARTMENT_ID,
    isActive: true,
    ...overrides,
  }
}

function mockValidRequestCreation(t, overrides = {}) {
  const offering = createOffering(overrides.offering)
  const course = createCourse(overrides.course)

  const offeringLookup = t.mock.method(
    CourseOffering,
    'findById',
    async () => offering,
  )

  const courseLookup = t.mock.method(Course, 'findOne', async () => course)

  const requestLookup = t.mock.method(
    CourseOfferingReactivationRequest,
    'findOne',
    async () => null,
  )

  const save = t.mock.method(
    CourseOfferingReactivationRequest.prototype,
    'save',
    async function () {
      return this
    },
  )

  return {
    offering,
    course,
    offeringLookup,
    courseLookup,
    requestLookup,
    save,
  }
}

test('creates a pending reactivation request for an authorized coordinator', async (t) => {
  const mocks = mockValidRequestCreation(t)

  const request = await service.createReactivationRequest(
    coordinator,
    OFFERING_ID,
    validReason,
  )

  assert.equal(request.courseOfferingId.toString(), OFFERING_ID)
  assert.equal(request.requestedBy.toString(), COORDINATOR_ID)
  assert.equal(request.requestReason, validReason)
  assert.equal(request.status, 'pending')

  assert.equal(mocks.offeringLookup.mock.callCount(), 1)
  assert.equal(mocks.courseLookup.mock.callCount(), 1)
  assert.equal(mocks.requestLookup.mock.callCount(), 1)
  assert.equal(mocks.save.mock.callCount(), 1)
})

test('rejects unauthenticated users', async () => {
  await assert.rejects(
    service.createReactivationRequest(null, OFFERING_ID, validReason),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 401)
      assert.equal(error.code, 'AUTHENTICATION_REQUIRED')
      return true
    },
  )
})

test('rejects users who are not coordinators', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  for (const user of [admin, student]) {
    await assert.rejects(
      service.createReactivationRequest(user, OFFERING_ID, validReason),
      (error) => {
        assert.equal(error.statusCode, 403)
        assert.equal(error.code, 'FORBIDDEN')
        return true
      },
    )
  }

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('rejects coordinators without a valid department assignment', async () => {
  const invalidCoordinator = {
    ...coordinator,
    departmentId: null,
  }

  await assert.rejects(
    service.createReactivationRequest(
      invalidCoordinator,
      OFFERING_ID,
      validReason,
    ),
    (error) => {
      assert.equal(error.statusCode, 403)
      assert.equal(error.code, 'FORBIDDEN')
      return true
    },
  )
})

test('rejects an invalid course offering ID', async () => {
  await assert.rejects(
    service.createReactivationRequest(coordinator, 'invalid-id', validReason),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )
})

test('rejects a missing or invalid request reason', async (t) => {
  const offeringLookup = t.mock.method(CourseOffering, 'findById')

  for (const reason of [
    undefined,
    null,
    '',
    'Too short',
    'x'.repeat(1001),
    12345,
  ]) {
    await assert.rejects(
      service.createReactivationRequest(coordinator, OFFERING_ID, reason),
      (error) => {
        assert.equal(error.statusCode, 400)
        assert.equal(error.code, 'VALIDATION_ERROR')
        return true
      },
    )
  }

  assert.equal(offeringLookup.mock.callCount(), 0)
})

test('returns not found when the offering does not exist', async (t) => {
  t.mock.method(CourseOffering, 'findById', async () => null)

  const courseLookup = t.mock.method(Course, 'findOne')

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_OFFERING_NOT_FOUND')
      return true
    },
  )

  assert.equal(courseLookup.mock.callCount(), 0)
})

test('restricts coordinators to offerings in their own department', async (t) => {
  t.mock.method(CourseOffering, 'findById', async () => createOffering())

  const courseLookup = t.mock.method(Course, 'findOne', async () => null)

  const requestLookup = t.mock.method(
    CourseOfferingReactivationRequest,
    'findOne',
  )

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_OFFERING_NOT_FOUND')
      return true
    },
  )

  assert.deepEqual(courseLookup.mock.calls[0].arguments[0], {
    _id: COURSE_ID,
    departmentId: DEPARTMENT_ID,
  })

  assert.equal(requestLookup.mock.callCount(), 0)
})

test('rejects an offering that is already active', async (t) => {
  const mocks = mockValidRequestCreation(t, {
    offering: { isActive: true },
  })

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'COURSE_OFFERING_ALREADY_ACTIVE')
      return true
    },
  )

  assert.equal(mocks.requestLookup.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects reactivation when the parent course is inactive', async (t) => {
  const mocks = mockValidRequestCreation(t, {
    course: { isActive: false },
  })

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'PARENT_COURSE_INACTIVE')
      return true
    },
  )

  assert.equal(mocks.requestLookup.mock.callCount(), 0)
  assert.equal(mocks.save.mock.callCount(), 0)
})

test('rejects creation when a pending request already exists', async (t) => {
  const mocks = mockValidRequestCreation(t, {
    request: { status: 'pending' },
  })

  mocks.requestLookup.mock.mockImplementation(async () => ({
    _id: '507f1f77bcf86cd799439018',
    status: 'pending',
  }))

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'REACTIVATION_REQUEST_ALREADY_PENDING')
      return true
    },
  )

  assert.equal(mocks.save.mock.callCount(), 0)
})

test('converts duplicate-key race errors into a conflict', async (t) => {
  mockValidRequestCreation(t)

  t.mock.method(
    CourseOfferingReactivationRequest.prototype,
    'save',
    async () => {
      const error = new Error('Duplicate key')
      error.code = 11000
      throw error
    },
  )

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'REACTIVATION_REQUEST_ALREADY_PENDING')
      return true
    },
  )
})

test('propagates unexpected database errors', async (t) => {
  const databaseError = new Error('Database unavailable')

  mockValidRequestCreation(t)

  t.mock.method(
    CourseOfferingReactivationRequest.prototype,
    'save',
    async () => {
      throw databaseError
    },
  )

  await assert.rejects(
    service.createReactivationRequest(coordinator, OFFERING_ID, validReason),
    (error) => error === databaseError,
  )
})

const ADMIN_ID = '507f1f77bcf86cd799439016'
const REQUEST_ID = '507f1f77bcf86cd799439018'

function createPendingRequest() {
  return new CourseOfferingReactivationRequest({
    _id: REQUEST_ID,
    courseOfferingId: OFFERING_ID,
    requestedBy: COORDINATOR_ID,
    requestReason: validReason,
    status: 'pending',
  })
}

function mockTransaction(t) {
  let transactionCallbackCount = 0
  let sessionEnded = false

  const session = {
    withTransaction: async (callback) => {
      transactionCallbackCount += 1
      await callback()
    },
    endSession: async () => {
      sessionEnded = true
    },
  }

  const startSession = t.mock.method(
    mongoose,
    'startSession',
    async () => session,
  )

  return {
    session,
    startSession,
    get transactionCallbackCount() {
      return transactionCallbackCount
    },
    get sessionEnded() {
      return sessionEnded
    },
  }
}

function mockDecisionDependencies(t, options = {}) {
  const request = options.request || createPendingRequest()

  const offering = {
    ...createOffering(options.offering),
    save: async function () {
      return this
    },
  }

  const course = createCourse(options.course)

  const transaction = mockTransaction(t)

  const requestLookup = t.mock.method(
    CourseOfferingReactivationRequest,
    'findById',
    () => ({
      session: async () => request,
    }),
  )

  const offeringLookup = t.mock.method(CourseOffering, 'findById', () => ({
    session: async () => offering,
  }))

  const courseLookup = t.mock.method(Course, 'findOne', (filter) => ({
    session: async () =>
      filter.isActive === true && course.isActive ? course : null,
  }))

  const requestSave = t.mock.method(
    CourseOfferingReactivationRequest.prototype,
    'save',
    async function () {
      return this
    },
  )

  const offeringSave = t.mock.method(offering, 'save', async function () {
    return this
  })

  return {
    request,
    offering,
    course,
    transaction,
    requestLookup,
    offeringLookup,
    courseLookup,
    requestSave,
    offeringSave,
  }
}

test('approves a pending request and reactivates its offering transactionally', async (t) => {
  const mocks = mockDecisionDependencies(t)

  const result = await service.approveReactivationRequest(
    admin,
    REQUEST_ID,
    'The department has approved the academic requirement.',
  )

  assert.equal(result.status, 'approved')
  assert.equal(result.decidedBy.toString(), ADMIN_ID)
  assert.equal(
    result.decisionReason,
    'The department has approved the academic requirement.',
  )
  assert.ok(result.decidedAt instanceof Date)

  assert.equal(mocks.offering.isActive, true)
  assert.equal(mocks.offeringSave.mock.callCount(), 1)
  assert.equal(mocks.requestSave.mock.callCount(), 1)

  assert.equal(mocks.transaction.transactionCallbackCount, 1)
  assert.equal(mocks.transaction.sessionEnded, true)
})

test('rejects a pending request without activating its offering', async (t) => {
  const mocks = mockDecisionDependencies(t)

  const result = await service.rejectReactivationRequest(
    admin,
    REQUEST_ID,
    'The academic requirement is not currently approved.',
  )

  assert.equal(result.status, 'rejected')
  assert.equal(result.decidedBy.toString(), ADMIN_ID)
  assert.ok(result.decidedAt instanceof Date)

  assert.equal(mocks.offering.isActive, false)
  assert.equal(mocks.offeringSave.mock.callCount(), 0)
  assert.equal(mocks.requestSave.mock.callCount(), 1)
  assert.equal(mocks.courseLookup.mock.callCount(), 0)

  assert.equal(mocks.transaction.transactionCallbackCount, 1)
  assert.equal(mocks.transaction.sessionEnded, true)
})

test('prevents non-administrators from approving or rejecting requests', async (t) => {
  const startSession = t.mock.method(mongoose, 'startSession')

  for (const user of [coordinator, student]) {
    await assert.rejects(
      service.approveReactivationRequest(
        user,
        REQUEST_ID,
        'Approved for academic reasons.',
      ),
      (error) => {
        assert.equal(error.statusCode, 403)
        assert.equal(error.code, 'FORBIDDEN')
        return true
      },
    )

    await assert.rejects(
      service.rejectReactivationRequest(
        user,
        REQUEST_ID,
        'Rejected for academic reasons.',
      ),
      (error) => {
        assert.equal(error.statusCode, 403)
        assert.equal(error.code, 'FORBIDDEN')
        return true
      },
    )
  }

  assert.equal(startSession.mock.callCount(), 0)
})

test('rejects unauthenticated decision attempts', async (t) => {
  const startSession = t.mock.method(mongoose, 'startSession')

  await assert.rejects(
    service.approveReactivationRequest(
      null,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 401)
      assert.equal(error.code, 'AUTHENTICATION_REQUIRED')
      return true
    },
  )

  assert.equal(startSession.mock.callCount(), 0)
})

test('rejects invalid request IDs and decision reasons before starting a transaction', async (t) => {
  const startSession = t.mock.method(mongoose, 'startSession')

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      'invalid-id',
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )

  for (const reason of [undefined, null, '', 'Too short', 'x'.repeat(1001)]) {
    await assert.rejects(
      service.rejectReactivationRequest(admin, REQUEST_ID, reason),
      (error) => {
        assert.equal(error.statusCode, 400)
        assert.equal(error.code, 'VALIDATION_ERROR')
        return true
      },
    )
  }

  assert.equal(startSession.mock.callCount(), 0)
})

test('returns not found when the decision request does not exist', async (t) => {
  const transaction = mockTransaction(t)

  t.mock.method(CourseOfferingReactivationRequest, 'findById', () => ({
    session: async () => null,
  }))

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'REACTIVATION_REQUEST_NOT_FOUND')
      return true
    },
  )

  assert.equal(transaction.transactionCallbackCount, 1)
  assert.equal(transaction.sessionEnded, true)
})

test('prevents deciding a request that is no longer pending', async (t) => {
  const request = createPendingRequest()
  request.status = 'rejected'

  const transaction = mockTransaction(t)

  t.mock.method(CourseOfferingReactivationRequest, 'findById', () => ({
    session: async () => request,
  }))

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'REACTIVATION_REQUEST_ALREADY_DECIDED')
      return true
    },
  )

  assert.equal(transaction.sessionEnded, true)
})

test('does not reactivate an offering when its parent course is inactive', async (t) => {
  const mocks = mockDecisionDependencies(t, {
    course: { isActive: false },
  })

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'PARENT_COURSE_INACTIVE')
      return true
    },
  )

  assert.equal(mocks.offeringSave.mock.callCount(), 0)
  assert.equal(mocks.requestSave.mock.callCount(), 0)
  assert.equal(mocks.transaction.sessionEnded, true)
})

test('does not reactivate an offering that is already active', async (t) => {
  const mocks = mockDecisionDependencies(t, {
    offering: { isActive: true },
  })

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 409)
      assert.equal(error.code, 'COURSE_OFFERING_ALREADY_ACTIVE')
      return true
    },
  )

  assert.equal(mocks.courseLookup.mock.callCount(), 0)
  assert.equal(mocks.offeringSave.mock.callCount(), 0)
  assert.equal(mocks.requestSave.mock.callCount(), 0)
  assert.equal(mocks.transaction.sessionEnded, true)
})

test('does not decide a request when its offering no longer exists', async (t) => {
  const request = createPendingRequest()
  const transaction = mockTransaction(t)

  t.mock.method(CourseOfferingReactivationRequest, 'findById', () => ({
    session: async () => request,
  }))

  t.mock.method(CourseOffering, 'findById', () => ({
    session: async () => null,
  }))

  const requestSave = t.mock.method(
    CourseOfferingReactivationRequest.prototype,
    'save',
  )

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => {
      assert.equal(error.statusCode, 404)
      assert.equal(error.code, 'COURSE_OFFERING_NOT_FOUND')
      return true
    },
  )

  assert.equal(requestSave.mock.callCount(), 0)
  assert.equal(transaction.sessionEnded, true)
})

test('ends the transaction session when a database operation fails', async (t) => {
  const mocks = mockDecisionDependencies(t)
  const databaseError = new Error('Offering save failed')

  mocks.offeringSave.mock.mockImplementation(async () => {
    throw databaseError
  })

  await assert.rejects(
    service.approveReactivationRequest(
      admin,
      REQUEST_ID,
      'Approved for academic reasons.',
    ),
    (error) => error === databaseError,
  )

  assert.equal(mocks.requestSave.mock.callCount(), 0)
  assert.equal(mocks.transaction.sessionEnded, true)
})
