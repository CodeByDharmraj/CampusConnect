const test = require('node:test')
const assert = require('node:assert/strict')

const ApiError = require('../src/utils/ApiError')

const {
  validateCreateTimetableEntry,
  validateUpdateTimetableEntry,
  validateTimetableEntryId,
} = require('../src/validation/timetableValidation')

const OFFERING_ID = '507f1f77bcf86cd799439011'
const FACULTY_ID = '507f1f77bcf86cd799439012'
const ENTRY_ID = '507f1f77bcf86cd799439013'

const VALID_INPUT = {
  courseOfferingId: OFFERING_ID,
  facultyId: FACULTY_ID,
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  room: 'Room 101',
  mode: 'offline',
}

function assertValidationError(callback) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    return true
  })
}

test('accepts a valid timetable entry', () => {
  assert.deepEqual(validateCreateTimetableEntry(VALID_INPUT), VALID_INPUT)
})

test('normalizes room whitespace and mode case', () => {
  const result = validateCreateTimetableEntry({
    ...VALID_INPUT,
    room: '  Room 202  ',
    mode: ' OFFLINE ',
  })

  assert.equal(result.room, 'Room 202')
  assert.equal(result.mode, 'offline')
})

test('rejects null, arrays and non-object request bodies', () => {
  for (const body of [null, undefined, [], 'invalid', 123]) {
    assertValidationError(() => validateCreateTimetableEntry(body))
  }
})

test('rejects unexpected fields', () => {
  assertValidationError(() =>
    validateCreateTimetableEntry({
      ...VALID_INPUT,
      isActive: false,
    }),
  )
})

test('requires every creation field', () => {
  for (const field of Object.keys(VALID_INPUT)) {
    const input = { ...VALID_INPUT }
    delete input[field]

    assertValidationError(() => validateCreateTimetableEntry(input))
  }
})

test('rejects invalid course offering and faculty IDs', () => {
  assertValidationError(() =>
    validateCreateTimetableEntry({
      ...VALID_INPUT,
      courseOfferingId: 'invalid-id',
    }),
  )

  assertValidationError(() =>
    validateCreateTimetableEntry({
      ...VALID_INPUT,
      facultyId: 'invalid-id',
    }),
  )
})

test('rejects invalid day values', () => {
  for (const dayOfWeek of [-1, 7, 1.5, '1']) {
    assertValidationError(() =>
      validateCreateTimetableEntry({
        ...VALID_INPUT,
        dayOfWeek,
      }),
    )
  }
})

test('accepts all seven days of the week', () => {
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    const result = validateCreateTimetableEntry({
      ...VALID_INPUT,
      dayOfWeek,
    })

    assert.equal(result.dayOfWeek, dayOfWeek)
  }
})

test('rejects invalid time formats', () => {
  for (const startTime of ['9:00', '25:00', '09:60', 'invalid']) {
    assertValidationError(() =>
      validateCreateTimetableEntry({
        ...VALID_INPUT,
        startTime,
      }),
    )
  }
})

test('rejects end time earlier than or equal to start time', () => {
  for (const endTime of ['08:00', '09:00']) {
    assertValidationError(() =>
      validateCreateTimetableEntry({
        ...VALID_INPUT,
        endTime,
      }),
    )
  }
})

test('accepts valid timetable modes', () => {
  for (const mode of ['offline', 'online', 'hybrid']) {
    const result = validateCreateTimetableEntry({
      ...VALID_INPUT,
      mode,
    })

    assert.equal(result.mode, mode)
  }
})

test('rejects unsupported timetable modes', () => {
  assertValidationError(() =>
    validateCreateTimetableEntry({
      ...VALID_INPUT,
      mode: 'recorded',
    }),
  )
})

test('rejects empty and overly long room names', () => {
  for (const room of ['   ', 'R'.repeat(101)]) {
    assertValidationError(() =>
      validateCreateTimetableEntry({
        ...VALID_INPUT,
        room,
      }),
    )
  }
})

test('accepts a valid partial update', () => {
  assert.deepEqual(
    validateUpdateTimetableEntry({
      startTime: '10:00',
    }),
    {
      startTime: '10:00',
    },
  )
})

test('normalizes partial update values', () => {
  const result = validateUpdateTimetableEntry({
    room: '  Lab 2  ',
    mode: ' HYBRID ',
  })

  assert.deepEqual(result, {
    room: 'Lab 2',
    mode: 'hybrid',
  })
})

test('rejects an empty update', () => {
  assertValidationError(() => validateUpdateTimetableEntry({}))
})

test('rejects protected or unexpected update fields', () => {
  for (const field of ['isActive', 'createdAt', 'updatedAt', 'status']) {
    assertValidationError(() =>
      validateUpdateTimetableEntry({
        [field]: false,
      }),
    )
  }
})

test('rejects invalid IDs during partial updates', () => {
  assertValidationError(() =>
    validateUpdateTimetableEntry({
      facultyId: 'invalid-id',
    }),
  )

  assertValidationError(() =>
    validateUpdateTimetableEntry({
      courseOfferingId: 'invalid-id',
    }),
  )
})

test('rejects invalid time ranges when both times are updated', () => {
  assertValidationError(() =>
    validateUpdateTimetableEntry({
      startTime: '11:00',
      endTime: '10:00',
    }),
  )
})

test('accepts a valid timetable entry ID', () => {
  assert.equal(validateTimetableEntryId(ENTRY_ID), ENTRY_ID)
})

test('rejects an invalid timetable entry ID', () => {
  assertValidationError(() => validateTimetableEntryId('invalid-id'))
})
