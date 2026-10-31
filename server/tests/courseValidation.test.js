const test = require('node:test')
const assert = require('node:assert/strict')

const ApiError = require('../src/utils/ApiError')
const {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseId,
} = require('../src/validation/courseValidation')

const DEPARTMENT_ID = '507f1f77bcf86cd799439011'
const COURSE_ID = '507f1f77bcf86cd799439012'

function assertValidationError(callback) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    return true
  })
}

test('normalizes course name, code and description', () => {
  const result = validateCreateCourse({
    name: '  Database Management Systems  ',
    code: ' cs301 ',
    description: '  Introduction to databases  ',
    credits: 4,
    departmentId: DEPARTMENT_ID,
  })

  assert.deepEqual(result, {
    name: 'Database Management Systems',
    code: 'CS301',
    description: 'Introduction to databases',
    credits: 4,
    departmentId: DEPARTMENT_ID,
  })
})

test('applies an empty description when omitted', () => {
  const result = validateCreateCourse({
    name: 'Operating Systems',
    code: 'CS302',
    credits: 4,
  })

  assert.equal(result.description, '')
})

test('allows department ID to be omitted for coordinator creation', () => {
  const result = validateCreateCourse({
    name: 'Operating Systems',
    code: 'CS302',
    credits: 4,
  })

  assert.equal(Object.hasOwn(result, 'departmentId'), false)
})

test('rejects non-object creation bodies', () => {
  for (const body of [null, [], 'course', 123]) {
    assertValidationError(() => validateCreateCourse(body))
  }
})

test('rejects unexpected creation fields', () => {
  assertValidationError(() =>
    validateCreateCourse({
      name: 'Database Management Systems',
      code: 'CS301',
      credits: 4,
      isActive: false,
    }),
  )
})

test('requires a valid course name', () => {
  for (const name of [undefined, 123, '', 'A', 'A'.repeat(151)]) {
    assertValidationError(() =>
      validateCreateCourse({
        name,
        code: 'CS301',
        credits: 4,
      }),
    )
  }
})

test('requires a valid course code', () => {
  for (const code of [
    undefined,
    123,
    'A',
    'A'.repeat(21),
    'CS 301',
    'CS@301',
  ]) {
    assertValidationError(() =>
      validateCreateCourse({
        name: 'Database Systems',
        code,
        credits: 4,
      }),
    )
  }
})

test('requires integer course credits between one and ten', () => {
  for (const credits of [undefined, '4', 0, 11, 3.5, null]) {
    assertValidationError(() =>
      validateCreateCourse({
        name: 'Database Systems',
        code: 'CS301',
        credits,
      }),
    )
  }
})

test('validates description type and maximum length', () => {
  for (const description of [123, null, 'A'.repeat(501)]) {
    assertValidationError(() =>
      validateCreateCourse({
        name: 'Database Systems',
        code: 'CS301',
        credits: 4,
        description,
      }),
    )
  }
})

test('validates department ObjectId format', () => {
  assertValidationError(() =>
    validateCreateCourse({
      name: 'Database Systems',
      code: 'CS301',
      credits: 4,
      departmentId: 'invalid-id',
    }),
  )
})

test('normalizes permitted course update fields', () => {
  const result = validateUpdateCourse({
    name: '  Advanced Databases  ',
    code: ' cs401 ',
    credits: 5,
  })

  assert.deepEqual(result, {
    name: 'Advanced Databases',
    code: 'CS401',
    credits: 5,
  })
})

test('rejects empty course updates', () => {
  assertValidationError(() => validateUpdateCourse({}))
})

test('rejects protected fields during course updates', () => {
  for (const field of ['departmentId', 'isActive', 'createdAt']) {
    assertValidationError(() =>
      validateUpdateCourse({
        [field]: 'unexpected',
      }),
    )
  }
})

test('validates individual course update values', () => {
  assertValidationError(() =>
    validateUpdateCourse({
      credits: 15,
    }),
  )
})

test('accepts a valid course ID', () => {
  assert.equal(validateCourseId(COURSE_ID), COURSE_ID)
})

test('rejects malformed course IDs', () => {
  for (const courseId of [undefined, null, 'invalid-id', '123']) {
    assertValidationError(() => validateCourseId(courseId))
  }
})
