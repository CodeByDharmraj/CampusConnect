const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Enrollment = require('../src/models/Enrollment')

function createValidEnrollment(overrides = {}) {
  return new Enrollment({
    studentId: new mongoose.Types.ObjectId(),
    courseOfferingId: new mongoose.Types.ObjectId(),
    ...overrides,
  })
}

test('defaults enrollment status to enrolled', () => {
  const enrollment = createValidEnrollment()

  assert.equal(enrollment.status, 'enrolled')
})

test('requires student and course offering', async () => {
  const enrollment = new Enrollment()

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.studentId)
    assert.ok(error.errors.courseOfferingId)
    return true
  })
})

test('rejects an invalid student ObjectId', async () => {
  const enrollment = createValidEnrollment({
    studentId: 'invalid-id',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.studentId)
    return true
  })
})

test('rejects an invalid course offering ObjectId', async () => {
  const enrollment = createValidEnrollment({
    courseOfferingId: 'invalid-id',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.courseOfferingId)
    return true
  })
})

test('accepts all supported enrollment statuses', async () => {
  for (const status of ['enrolled', 'completed', 'withdrawn']) {
    const enrollment = createValidEnrollment({ status })

    await enrollment.validate()
    assert.equal(enrollment.status, status)
  }
})

test('rejects unsupported enrollment statuses', async () => {
  const enrollment = createValidEnrollment({
    status: 'pending',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.status)
    return true
  })
})

test('references the User model for students', () => {
  const studentPath = Enrollment.schema.path('studentId')

  assert.equal(studentPath.instance, 'ObjectId')
  assert.equal(studentPath.options.ref, 'User')
})

test('references the CourseOffering model', () => {
  const offeringPath = Enrollment.schema.path('courseOfferingId')

  assert.equal(offeringPath.instance, 'ObjectId')
  assert.equal(offeringPath.options.ref, 'CourseOffering')
})

test('does not duplicate academic term fields', () => {
  assert.equal(Enrollment.schema.path('courseId'), undefined)
  assert.equal(Enrollment.schema.path('academicYear'), undefined)
  assert.equal(Enrollment.schema.path('semester'), undefined)
})

test('defines a permanent unique student offering index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.studentId === 1 &&
        fields.courseOfferingId === 1 &&
        options.unique === true &&
        options.partialFilterExpression === undefined,
    ),
  )
})

test('defines student enrollment lookup index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(([fields]) => fields.studentId === 1 && fields.status === 1),
  )
})

test('defines course offering roster lookup index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) => fields.courseOfferingId === 1 && fields.status === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(Enrollment.schema.options.timestamps, true)
})

test('exports supported enrollment statuses', () => {
  assert.deepEqual(Enrollment.ENROLLMENT_STATUSES, [
    'enrolled',
    'completed',
    'withdrawn',
  ])
})
