const test = require('node:test')
const assert = require('node:assert/strict')

const { validateFileIndex } = require('../src/validation/submissionValidation')
const {
  validateCorrectionRequestId,
} = require('../src/validation/attendanceValidation')
const ApiError = require('../src/utils/ApiError')

test('file index defaults to the first file', () => {
  assert.equal(validateFileIndex(), 0)
  assert.equal(validateFileIndex('0'), 0)
})

test('file index accepts canonical non-negative integers', () => {
  assert.equal(validateFileIndex('3'), 3)
  assert.equal(validateFileIndex('12'), 12)
})

test('file index rejects anything that is not a canonical integer', () => {
  for (const bad of [
    '-1',
    '1.5',
    '02',
    '1e1',
    'abc',
    '',
    ' 1',
    '9007199254740993',
  ]) {
    assert.throws(
      () => validateFileIndex(bad),
      (error) =>
        error instanceof ApiError &&
        error.statusCode === 400 &&
        error.code === 'VALIDATION_ERROR' &&
        error.message === 'A valid file index is required.',
      `expected ${JSON.stringify(bad)} to be rejected`,
    )
  }
})

test('correction request IDs are validated with their own message', () => {
  assert.equal(
    validateCorrectionRequestId('507f1f77bcf86cd799439011'),
    '507f1f77bcf86cd799439011',
  )

  assert.throws(
    () => validateCorrectionRequestId('not-an-id'),
    /Attendance correction request ID/,
  )
})
