const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const CourseOfferingReactivationRequest = require('../src/models/CourseOfferingReactivationRequest')

function createValidRequest(overrides = {}) {
  return new CourseOfferingReactivationRequest({
    courseOfferingId: new mongoose.Types.ObjectId(),
    requestedBy: new mongoose.Types.ObjectId(),
    requestReason: 'The department needs to resume this offering.',
    ...overrides,
  })
}

test('applies pending status by default', () => {
  const request = createValidRequest()

  assert.equal(request.status, 'pending')
})

test('requires offering, requester and request reason', async () => {
  const request = new CourseOfferingReactivationRequest()

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.courseOfferingId)
    assert.ok(error.errors.requestedBy)
    assert.ok(error.errors.requestReason)
    return true
  })
})

test('references CourseOffering and User models', () => {
  assert.equal(
    CourseOfferingReactivationRequest.schema.path('courseOfferingId').options
      .ref,
    'CourseOffering',
  )

  assert.equal(
    CourseOfferingReactivationRequest.schema.path('requestedBy').options.ref,
    'User',
  )

  assert.equal(
    CourseOfferingReactivationRequest.schema.path('decidedBy').options.ref,
    'User',
  )
})

test('trims the request reason', () => {
  const request = createValidRequest({
    requestReason: '  The department needs to resume this offering.  ',
  })

  assert.equal(
    request.requestReason,
    'The department needs to resume this offering.',
  )
})

test('rejects a request reason shorter than ten characters', async () => {
  const request = createValidRequest({
    requestReason: 'Resume',
  })

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.requestReason)
    return true
  })
})

test('rejects a request reason longer than one thousand characters', async () => {
  const request = createValidRequest({
    requestReason: 'R'.repeat(1001),
  })

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.requestReason)
    return true
  })
})

test('accepts a valid pending request without decision details', async () => {
  const request = createValidRequest()

  await assert.doesNotReject(request.validate())
})

test('rejects pending requests containing decision details', async () => {
  const request = createValidRequest({
    decidedBy: new mongoose.Types.ObjectId(),
    decidedAt: new Date(),
    decisionReason: 'This request has already been reviewed.',
  })

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.status)
    return true
  })
})

test('accepts an approved request with complete decision audit', async () => {
  const request = createValidRequest({
    status: 'approved',
    decidedBy: new mongoose.Types.ObjectId(),
    decidedAt: new Date(),
    decisionReason: 'The department has demonstrated a valid need.',
  })

  await assert.doesNotReject(request.validate())
})

test('accepts a rejected request with complete decision audit', async () => {
  const request = createValidRequest({
    status: 'rejected',
    decidedBy: new mongoose.Types.ObjectId(),
    decidedAt: new Date(),
    decisionReason: 'The department has not provided sufficient justification.',
  })

  await assert.doesNotReject(request.validate())
})

test('requires administrator identity, timestamp and reason for decisions', async () => {
  const request = createValidRequest({
    status: 'approved',
  })

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.decidedBy)
    assert.ok(error.errors.decidedAt)
    assert.ok(error.errors.decisionReason)
    return true
  })
})

test('rejects unsupported request statuses', async () => {
  const request = createValidRequest({
    status: 'cancelled',
  })

  await assert.rejects(request.validate(), (error) => {
    assert.ok(error.errors.status)
    return true
  })
})

test('defines a unique index for pending requests per offering', () => {
  const indexes = CourseOfferingReactivationRequest.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.courseOfferingId === 1 &&
        options.unique === true &&
        options.partialFilterExpression?.status === 'pending',
    ),
  )
})

test('defines request review lookup index', () => {
  const indexes = CourseOfferingReactivationRequest.schema.indexes()

  assert.ok(
    indexes.some(([fields]) => fields.status === 1 && fields.createdAt === -1),
  )
})

test('defines offering request history index', () => {
  const indexes = CourseOfferingReactivationRequest.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) => fields.courseOfferingId === 1 && fields.createdAt === -1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(
    CourseOfferingReactivationRequest.schema.options.timestamps,
    true,
  )
})
