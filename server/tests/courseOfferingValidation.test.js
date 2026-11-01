const test = require('node:test')
const assert = require('node:assert/strict')

const {
  validateCreateCourseOffering,
} = require('../src/validation/courseOfferingValidation')

const VALID_INPUT = {
  courseId: '507f1f77bcf86cd799439011',
  academicYear: '2026-2027',
  semester: 5,
  section: 'A',
}

test('accepts valid course offering input', () => {
  assert.deepEqual(validateCreateCourseOffering(VALID_INPUT), VALID_INPUT)
})

test('normalizes academic year whitespace and section case', () => {
  const result = validateCreateCourseOffering({
    ...VALID_INPUT,
    academicYear: ' 2026-2027 ',
    section: ' a ',
  })

  assert.equal(result.academicYear, '2026-2027')
  assert.equal(result.section, 'A')
})

test('rejects a non-object request body', () => {
  for (const body of [null, [], 'invalid', 123]) {
    assert.throws(() => validateCreateCourseOffering(body), {
      code: 'VALIDATION_ERROR',
    })
  }
})

test('rejects unexpected fields', () => {
  assert.throws(
    () =>
      validateCreateCourseOffering({
        ...VALID_INPUT,
        isActive: false,
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('rejects missing or invalid course IDs', () => {
  for (const courseId of [undefined, '', 'invalid-id']) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          courseId,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('rejects invalid academic year formats', () => {
  for (const academicYear of [
    undefined,
    '2026/2027',
    '26-27',
    '2026-2028',
    '2026-2026',
  ]) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          academicYear,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('rejects semesters outside the range 1 to 8', () => {
  for (const semester of [0, 9, -1]) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          semester,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('rejects fractional or non-numeric semesters', () => {
  for (const semester of [5.5, '5', null]) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          semester,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('normalizes section to uppercase', () => {
  const result = validateCreateCourseOffering({
    ...VALID_INPUT,
    section: 'b',
  })

  assert.equal(result.section, 'B')
})

test('rejects invalid section characters', () => {
  for (const section of ['A@1', 'A B', 'A_B']) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          section,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('rejects empty and overly long sections', () => {
  for (const section of ['', 'SECTION-123']) {
    assert.throws(
      () =>
        validateCreateCourseOffering({
          ...VALID_INPUT,
          section,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})
