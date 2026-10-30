const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const FacultyCourse = require('../src/models/FacultyCourse')

function createValidAssignment(overrides = {}) {
  return new FacultyCourse({
    facultyId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    academicYear: '2026-2027',
    semester: 5,
    ...overrides,
  })
}

test('normalizes academic year whitespace', () => {
  const assignment = createValidAssignment({
    academicYear: '  2026-2027  ',
  })

  assert.equal(assignment.academicYear, '2026-2027')
})

test('applies active assignment default', () => {
  const assignment = createValidAssignment({
    isActive: undefined,
  })

  assert.equal(assignment.isActive, true)
})

test('requires faculty, course, academic year and semester', async () => {
  const assignment = new FacultyCourse()

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.facultyId)
    assert.ok(error.errors.courseId)
    assert.ok(error.errors.academicYear)
    assert.ok(error.errors.semester)
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

test('rejects an invalid course ObjectId', async () => {
  const assignment = createValidAssignment({
    courseId: 'invalid-id',
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.courseId)
    return true
  })
})

test('rejects an academic year with an invalid format', async () => {
  const assignment = createValidAssignment({
    academicYear: '2026/2027',
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects academic years that are not consecutive', async () => {
  const assignment = createValidAssignment({
    academicYear: '2026-2028',
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects semesters below one or above eight', async () => {
  for (const semester of [0, 9]) {
    const assignment = createValidAssignment({ semester })

    await assert.rejects(assignment.validate(), (error) => {
      assert.ok(error.errors.semester)
      return true
    })
  }
})

test('rejects fractional semester values', async () => {
  const assignment = createValidAssignment({
    semester: 5.5,
  })

  await assert.rejects(assignment.validate(), (error) => {
    assert.ok(error.errors.semester)
    return true
  })
})

test('references the User model for faculty', () => {
  const facultyPath = FacultyCourse.schema.path('facultyId')

  assert.equal(facultyPath.instance, 'ObjectId')
  assert.equal(facultyPath.options.ref, 'User')
})

test('references the Course model', () => {
  const coursePath = FacultyCourse.schema.path('courseId')

  assert.equal(coursePath.instance, 'ObjectId')
  assert.equal(coursePath.options.ref, 'Course')
})

test('defines a unique index for active faculty course assignments', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.facultyId === 1 &&
        fields.courseId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        options.unique === true &&
        options.partialFilterExpression?.isActive === true,
    ),
  )
})

test('defines course assignment lookup index', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.courseId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.isActive === 1,
    ),
  )
})

test('defines faculty assignment lookup index', () => {
  const indexes = FacultyCourse.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.facultyId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.isActive === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(FacultyCourse.schema.options.timestamps, true)
})
