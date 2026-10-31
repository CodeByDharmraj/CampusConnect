const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const FacultyCourse = require('../src/models/FacultyCourse')

function createValidAssignment(overrides = {}) {
  return new FacultyCourse({
    facultyId: new mongoose.Types.ObjectId(),
    courseOfferingId: new mongoose.Types.ObjectId(),
    ...overrides,
  })
}

test('applies active assignment default', () => {
  const assignment = createValidAssignment({
    isActive: undefined,
  })

  assert.equal(assignment.isActive, true)
})

test('requires faculty and course offering', async () => {
  const assignment = new FacultyCourse()

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.facultyId)
    assert.ok(error.errors.courseOfferingId)
    return true
  })
})

test('rejects an invalid faculty ObjectId', async () => {
  const assignment = createValidAssignment({
    facultyId: 'invalid-id',
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.facultyId)
    return true
  })
})

test('rejects an invalid course offering ObjectId', async () => {
  const assignment = createValidAssignment({
    courseOfferingId: 'invalid-id',
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.courseOfferingId)
    return true
  })
})

test('references the User model for faculty', () => {
  const facultyPath = FacultyCourse.schema.path('facultyId')

  assert.equal(facultyPath.instance, 'ObjectId')
  assert.equal(facultyPath.options.ref, 'User')
})

test('references the CourseOffering model', () => {
  const offeringPath = FacultyCourse.schema.path('courseOfferingId')

  assert.equal(offeringPath.instance, 'ObjectId')
  assert.equal(offeringPath.options.ref, 'CourseOffering')
})

test('does not duplicate academic term fields', () => {
  assert.equal(FacultyCourse.schema.path('courseId'), undefined)
  assert.equal(FacultyCourse.schema.path('academicYear'), undefined)
  assert.equal(FacultyCourse.schema.path('semester'), undefined)
})

test('defines a unique index for active faculty offering assignments', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.facultyId === 1 &&
        fields.courseOfferingId === 1 &&
        options.unique === true &&
        options.partialFilterExpression?.isActive === true,
    ),
  )
})

test('defines course offering assignment lookup index', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) => fields.courseOfferingId === 1 && fields.isActive === 1,
    ),
  )
})

test('defines faculty assignment lookup index', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(([fields]) => fields.facultyId === 1 && fields.isActive === 1),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(FacultyCourse.schema.options.timestamps, true)
})
