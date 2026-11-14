const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const CourseOffering = require('../src/models/CourseOffering')

function createValidOffering(overrides = {}) {
  return new CourseOffering({
    courseId: new mongoose.Types.ObjectId(),
    academicYear: '2026-2027',
    semester: 5,
    section: 'A',
    ...overrides,
  })
}

test('normalizes academic year and section', () => {
  const offering = createValidOffering({
    academicYear: ' 2026-2027 ',
    section: ' a ',
  })

  assert.equal(offering.academicYear, '2026-2027')
  assert.equal(offering.section, 'A')
})

test('applies active offering default', () => {
  const offering = createValidOffering({ isActive: undefined })

  assert.equal(offering.isActive, true)
})

test('requires course, academic year, semester and section', async () => {
  const offering = new CourseOffering()

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.courseId)
    assert.ok(error.errors.academicYear)
    assert.ok(error.errors.semester)
    assert.ok(error.errors.section)
    return true
  })
})

test('rejects an invalid course ObjectId', async () => {
  const offering = createValidOffering({
    courseId: 'invalid-id',
  })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.courseId)
    return true
  })
})

test('references the Course model', () => {
  const coursePath = CourseOffering.schema.path('courseId')

  assert.equal(coursePath.instance, 'ObjectId')
  assert.equal(coursePath.options.ref, 'Course')
})

test('rejects an academic year with an invalid format', async () => {
  const offering = createValidOffering({
    academicYear: '2026/2027',
  })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects academic years that are not consecutive', async () => {
  const offering = createValidOffering({
    academicYear: '2026-2028',
  })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.academicYear)
    return true
  })
})

test('rejects semesters below one or above eight', async () => {
  for (const semester of [0, 9]) {
    const offering = createValidOffering({ semester })

    await assert.rejects(offering.validate(), (error) => {
      assert.ok(error.errors.semester)
      return true
    })
  }
})

test('rejects fractional semesters', async () => {
  const offering = createValidOffering({ semester: 5.5 })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.semester)
    return true
  })
})

test('normalizes section to uppercase', () => {
  const offering = createValidOffering({ section: 'b' })

  assert.equal(offering.section, 'B')
})

test('rejects invalid section characters', async () => {
  const offering = createValidOffering({ section: 'A@1' })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.section)
    return true
  })
})

test('rejects sections longer than ten characters', async () => {
  const offering = createValidOffering({
    section: 'SECTION-123',
  })

  await assert.rejects(offering.validate(), (error) => {
    assert.ok(error.errors.section)
    return true
  })
})

test('defines unique course term and section index', () => {
  const indexes = CourseOffering.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.courseId === 1 &&
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.section === 1 &&
        options.unique === true,
    ),
  )
})

test('defines active academic term lookup index', () => {
  const indexes = CourseOffering.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.academicYear === 1 &&
        fields.semester === 1 &&
        fields.isActive === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(CourseOffering.schema.options.timestamps, true)
})
