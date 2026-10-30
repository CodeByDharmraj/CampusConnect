const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Enrollment = require('../src/models/Enrollment')

function createValidEnrollment(overrides = {}) {
  return new Enrollment({
    studentId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    academicYear: '2026-2027',
    semester: 5,
    ...overrides,
  })
}

test('normalizes academic year whitespace', () => {
  const enrollment = createValidEnrollment({
    academicYear: '  2026-2027  ',
  })

  assert.equal(enrollment.academicYear, '2026-2027')
})

test('defaults enrollment status to enrolled', () => {
  const enrollment = createValidEnrollment()

  assert.equal(enrollment.status, 'enrolled')
})

test('requires student, course, academic year and semester', async () => {
  const enrollment = new Enrollment()

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.studentId)
    assert.ok(error.errors.courseId)
    assert.ok(error.errors.academicYear)
    assert.ok(error.errors.semester)
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

test('rejects an invalid course ObjectId', async () => {
  const enrollment = createValidEnrollment({
    courseId: 'invalid-id',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.courseId)
    return true
  })
})

test('rejects an academic year with an invalid format', async () => {
  const enrollment = createValidEnrollment({
    academicYear: '2026/2027',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects academic years that are not consecutive', async () => {
  const enrollment = createValidEnrollment({
    academicYear: '2026-2028',
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects semesters below one or above eight', async () => {
  for (const semester of [0, 9]) {
    const enrollment = createValidEnrollment({ semester })

    await assert.rejects(enrollment.validate(), (error) => {
      assert.ok(error.errors.semester)
      return true
    })
  }
})

test('rejects fractional semester values', async () => {
  const enrollment = createValidEnrollment({
    semester: 5.5,
  })

  await assert.rejects(enrollment.validate(), (error) => {
    assert.ok(error.errors.semester)
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

test('references the Course model', () => {
  const coursePath = Enrollment.schema.path('courseId')

  assert.equal(coursePath.instance, 'ObjectId')
  assert.equal(coursePath.options.ref, 'Course')
})

test('defines a permanent unique student course term index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.studentId === 1 &&
        fields.courseId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        options.unique === true &&
        options.partialFilterExpression === undefined,
    ),
  )
})

test('defines student enrollment lookup index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.studentId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.status === 1,
    ),
  )
})

test('defines course roster lookup index', () => {
  const indexes = Enrollment.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.courseId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.status === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(Enrollment.schema.options.timestamps, true)
})
