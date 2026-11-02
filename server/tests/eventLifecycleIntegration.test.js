const test = require('node:test')
const assert = require('node:assert/strict')
const { mock } = require('node:test')
const mongoose = require('mongoose')

const Event = require('../src/models/Event')
const EventRegistration = require('../src/models/EventRegistration')
const Department = require('../src/models/Department')
const Club = require('../src/models/Club')
const eventService = require('../src/services/eventService')
const registrationService = require('../src/services/eventRegistrationService')

const STUDENT_ID = '507f1f77bcf86cd799439011'
const COORDINATOR_ID = '507f1f77bcf86cd799439012'
const DEPARTMENT_ID = '507f1f77bcf86cd799439013'
const OTHER_DEPARTMENT_ID = '507f1f77bcf86cd799439014'
const EVENT_ID = '507f1f77bcf86cd799439015'

function managedEvent(overrides = {}) {
  return {
    _id: EVENT_ID,
    departmentId: DEPARTMENT_ID,
    status: 'draft',
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 90000000),
    save: async function save() { return this },
    ...overrides,
  }
}

test('event schema enforces valid lifecycle statuses and date ordering', async () => {
  const invalidStatus = new Event({
    title: 'Campus festival', description: 'A detailed description for the event.',
    category: 'Cultural', clubId: EVENT_ID, departmentId: DEPARTMENT_ID,
    createdBy: COORDINATOR_ID, startsAt: new Date(Date.now() + 10000),
    endsAt: new Date(Date.now() + 20000), status: 'approved',
  })
  assert.ok(invalidStatus.validateSync().errors.status)

  const invalidDates = new Event({
    title: 'Campus festival', description: 'A detailed description for the event.',
    category: 'Cultural', clubId: EVENT_ID, departmentId: DEPARTMENT_ID,
    createdBy: COORDINATOR_ID, startsAt: new Date('2026-12-02'),
    endsAt: new Date('2026-12-01'),
  })
  await assert.rejects(invalidDates.validate(), (error) => {
    assert.ok(error.errors.endsAt)
    return true
  })
})

test('event capacity cannot be lower than existing registrations', () => {
  const event = new Event({
    title: 'Campus festival', description: 'A detailed description for the event.',
    category: 'Cultural', clubId: EVENT_ID, departmentId: DEPARTMENT_ID,
    createdBy: COORDINATOR_ID, startsAt: new Date(Date.now() + 10000),
    endsAt: new Date(Date.now() + 20000), registeredCount: 8, capacity: 5,
  })
  assert.ok(event.validateSync().errors.capacity)
})

test('coordinator event creation rejects a foreign department before database lookups', async () => {
  const departmentLookup = mock.method(Department, 'findOne')
  const clubLookup = mock.method(Club, 'findOne')
  await assert.rejects(
    eventService.createEvent({ _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }, {
      title: 'Other department event', departmentId: OTHER_DEPARTMENT_ID, clubId: EVENT_ID,
    }),
    { code: 'FORBIDDEN' },
  )
  assert.equal(departmentLookup.mock.callCount(), 0)
  assert.equal(clubLookup.mock.callCount(), 0)
})

test('coordinator cannot edit, publish, cancel or complete an event owned by another department', async () => {
  let filter
  mock.method(Event, 'findOne', (query) => {
    filter = query
    return Promise.resolve(null)
  })
  const coordinator = { _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }

  for (const action of [
    () => eventService.updateEvent(coordinator, EVENT_ID, { title: 'Changed title' }),
    () => eventService.publishEvent(coordinator, EVENT_ID),
    () => eventService.cancelEvent(coordinator, EVENT_ID, 'Reason'),
    () => eventService.completeEvent(coordinator, EVENT_ID),
  ]) {
    await assert.rejects(action(), { code: 'EVENT_NOT_FOUND' })
    assert.equal(String(filter.departmentId), DEPARTMENT_ID)
  }
})

test('only draft events can be published and publication requires a future start', async () => {
  mock.method(Event, 'findOne', async () => managedEvent({ status: 'cancelled' }))
  await assert.rejects(
    eventService.publishEvent({ _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }, EVENT_ID),
    { code: 'INVALID_EVENT_TRANSITION' },
  )
  mock.restoreAll()
  mock.method(Event, 'findOne', async () => managedEvent({ startsAt: new Date(Date.now() - 1000) }))
  await assert.rejects(
    eventService.publishEvent({ _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }, EVENT_ID),
    { code: 'EVENT_START_NOT_FUTURE' },
  )
})

test('published event can be cancelled but completed events cannot be cancelled', async () => {
  let event = managedEvent({ status: 'published' })
  mock.method(Event, 'findOne', async () => event)
  mock.method(Event, 'findById', () => ({ populate() { return this } }))
  await eventService.cancelEvent({ _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }, EVENT_ID, 'Weather')
  assert.equal(event.status, 'cancelled')
  assert.equal(event.cancellationReason, 'Weather')
  mock.restoreAll()
  event = managedEvent({ status: 'completed' })
  mock.method(Event, 'findOne', async () => event)
  await assert.rejects(
    eventService.cancelEvent({ _id: COORDINATOR_ID, role: 'coordinator', departmentId: DEPARTMENT_ID }, EVENT_ID),
    { code: 'INVALID_EVENT_TRANSITION' },
  )
})

test('registration schema and indexes protect one registration per event/student', () => {
  const uniqueIndex = EventRegistration.schema.indexes().find(([keys, options]) =>
    keys.eventId === 1 && keys.studentId === 1 && options.unique === true,
  )
  assert.ok(uniqueIndex)
})

test('registration is student-only before opening a database session', async () => {
  const startSession = mock.method(mongoose, 'startSession')
  await assert.rejects(
    registrationService.registerForEvent({ _id: COORDINATOR_ID, role: 'coordinator' }, EVENT_ID),
    { code: 'STUDENT_REQUIRED' },
  )
  assert.equal(startSession.mock.callCount(), 0)
})

test('capacity limit is enforced in the atomic registration update', async () => {
  let updateFilter
  const session = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  }
  mock.method(mongoose, 'startSession', async () => session)
  mock.method(EventRegistration, 'findOne', () => ({ session: async () => null }))
  mock.method(Event, 'findOneAndUpdate', (filter) => {
    updateFilter = filter
    return Promise.resolve(null)
  })
  mock.method(Event, 'findById', () => ({
    session: async () => ({
      status: 'published',
      startsAt: new Date(Date.now() + 86400000),
      capacity: 10,
      registeredCount: 10,
    }),
  }))

  await assert.rejects(
    registrationService.registerForEvent({ _id: STUDENT_ID, role: 'student' }, EVENT_ID),
    { code: 'EVENT_FULL' },
  )
  const capacityGuard = updateFilter.$and.find((condition) => condition.$or?.some((item) => item.$expr))
  assert.ok(capacityGuard, 'Expected capacity check in the atomic event update filter')
})
