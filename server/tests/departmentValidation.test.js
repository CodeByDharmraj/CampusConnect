const test = require('node:test')
const assert = require('node:assert/strict')

const {
  validateCreateDepartment,
} = require('../src/validation/departmentValidation')

test('normalizes department name and code', () => {
  const result = validateCreateDepartment({
    name: '  Computer Science and Engineering  ',
    code: ' cse ',
  })

  assert.deepEqual(result, {
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: '',
  })
})

test('accepts a valid description', () => {
  const result = validateCreateDepartment({
    name: 'Computer Science',
    code: 'CSE',
    description: 'Computer Science department',
  })

  assert.equal(result.description, 'Computer Science department')
})

test('rejects null, arrays and non-object bodies', () => {
  for (const body of [null, [], 'invalid', 123]) {
    assert.throws(() => validateCreateDepartment(body), {
      code: 'VALIDATION_ERROR',
    })
  }
})

test('rejects missing department name', () => {
  assert.throws(() => validateCreateDepartment({ code: 'CSE' }), {
    code: 'VALIDATION_ERROR',
  })
})

test('rejects invalid department names', () => {
  for (const name of ['C', 'A'.repeat(101), '  ']) {
    assert.throws(() => validateCreateDepartment({ name, code: 'CSE' }), {
      code: 'VALIDATION_ERROR',
    })
  }
})

test('rejects invalid department codes', () => {
  for (const code of ['C', 'CSE@', 'A'.repeat(13)]) {
    assert.throws(
      () =>
        validateCreateDepartment({
          name: 'Computer Science',
          code,
        }),
      { code: 'VALIDATION_ERROR' },
    )
  }
})

test('rejects descriptions longer than 500 characters', () => {
  assert.throws(
    () =>
      validateCreateDepartment({
        name: 'Computer Science',
        code: 'CSE',
        description: 'A'.repeat(501),
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('rejects unexpected fields such as isActive', () => {
  assert.throws(
    () =>
      validateCreateDepartment({
        name: 'Computer Science',
        code: 'CSE',
        isActive: false,
      }),
    { code: 'VALIDATION_ERROR' },
  )
})
