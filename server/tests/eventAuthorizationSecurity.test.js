const test = require('node:test')
const assert = require('node:assert/strict')
const EventRegistration = require('../src/models/EventRegistration')
const EventAttendance = require('../src/models/EventAttendance')
const Event = require('../src/models/Event')
const Department = require('../src/models/Department')
const Club = require('../src/models/Club')
const eventRegistrationService = require('../src/services/eventRegistrationService')
const eventAttendanceService = require('../src/services/eventAttendanceService')
const eventService = require('../src/services/eventService')

const STUDENT_ID = '507f1f77bcf86cd799439011'
const COORDINATOR_ID = '507f1f77bcf86cd799439012'
const DEPARTMENT_ID = '507f1f77bcf86cd799439013'
const OTHER_DEPARTMENT_ID = '507f1f77bcf86cd799439014'
const EVENT_ID = '507f1f77bcf86cd799439015'

test('event registration model enforces one registration per event and student', () => {
  const uniqueIndex = EventRegistration.schema.indexes().find(
    ([keys, options]) =>
      keys.eventId === 1 &&
      keys.studentId === 1 &&
      options.unique === true,
  )

  assert.ok(uniqueIndex)
})

test('event attendance model enforces one attendance record per event and student', () => {
  const uniqueIndex = EventAttendance.schema.indexes().find(
    ([keys, options]) =>
      keys.eventId === 1 &&
      keys.studentId === 1 &&
      options.unique === true,
  )

  assert.ok(uniqueIndex)
})

test('event registration schema rejects unsupported statuses', async () => {
  const registration = new EventRegistration({
    eventId: EVENT_ID,
    studentId: STUDENT_ID,
    status: 'checked-in',
  })

  const error = registration.validateSync()
  assert.ok(error)
  assert.ok(error.errors.status)
})

test('faculty cannot register for an event as a student', async () => {
  await assert.rejects(
    eventRegistrationService.registerForEvent(
      { _id: COORDINATOR_ID, role: 'faculty' },
      EVENT_ID,
    ),
    { code: 'STUDENT_REQUIRED' },
  )
})

test('coordinator cannot cancel a student event registration', async () => {
  await assert.rejects(
    eventRegistrationService.cancelRegistration(
      { _id: COORDINATOR_ID, role: 'coordinator' },
      EVENT_ID,
    ),
    { code: 'STUDENT_REQUIRED' },
  )
})

test('faculty cannot read the student registration history endpoint service', async () => {
  await assert.rejects(
    eventRegistrationService.getMyRegistrations(
      { _id: COORDINATOR_ID, role: 'faculty' },
    ),
    { code: 'STUDENT_REQUIRED' },
  )
})

test('students cannot view event participants or mark event attendance', async () => {
  await assert.rejects(
    eventAttendanceService.getEventParticipants(
      { _id: STUDENT_ID, role: 'student' },
      EVENT_ID,
    ),
    { code: 'FORBIDDEN' },
  )

  await assert.rejects(
    eventAttendanceService.markEventAttendance(
      { _id: STUDENT_ID, role: 'student' },
      EVENT_ID,
      [{ studentId: STUDENT_ID, status: 'present' }],
    ),
    { code: 'FORBIDDEN' },
  )
})

test('coordinator cannot create an event for another department', async (t) => {
  const departmentLookup = t.mock.method(Department, 'findOne')
  const clubLookup = t.mock.method(Club, 'findOne')

  await assert.rejects(
    eventService.createEvent(
      {
        _id: COORDINATOR_ID,
        role: 'coordinator',
        departmentId: DEPARTMENT_ID,
      },
      {
        title: 'Cross-department event',
        clubId: EVENT_ID,
        departmentId: OTHER_DEPARTMENT_ID,
      },
    ),
    { code: 'FORBIDDEN' },
  )

  assert.equal(departmentLookup.mock.callCount(), 0)
  assert.equal(clubLookup.mock.callCount(), 0)
})

test('coordinator event listing is scoped to the coordinator department', async (t) => {
  let receivedFilter
  const query = {
    sort() { return this },
    populate() { return this },
  }

  t.mock.method(Event, 'find', (filter) => {
    receivedFilter = filter
    return query
  })

  await eventService.getEvents(
    {
      _id: COORDINATOR_ID,
      role: 'coordinator',
      departmentId: DEPARTMENT_ID,
    },
    {},
  )

  assert.equal(String(receivedFilter.departmentId), DEPARTMENT_ID)
})

test('coordinator cannot request another department event filter', async () => {
  await assert.rejects(
    eventService.getEvents(
      {
        _id: COORDINATOR_ID,
        role: 'coordinator',
        departmentId: DEPARTMENT_ID,
      },
      { departmentId: OTHER_DEPARTMENT_ID },
    ),
    { code: 'FORBIDDEN' },
  )
})

test('coordinator without a department assignment is denied event management', async () => {
  await assert.rejects(
    eventService.getEvents(
      { _id: COORDINATOR_ID, role: 'coordinator' },
      {},
    ),
    { code: 'DEPARTMENT_REQUIRED' },
  )
})
