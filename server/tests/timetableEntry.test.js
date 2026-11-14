const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

const TimetableEntry = require('../src/models/TimetableEntry')

function createValidEntry(overrides = {}) {
  return new TimetableEntry({
    courseOfferingId: new mongoose.Types.ObjectId(),
    facultyId: new mongoose.Types.ObjectId(),
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: 'Room 101',
    mode: 'offline',
    ...overrides,
  })
}

test('creates a valid timetable entry', async () => {
  const entry = createValidEntry()

  await assert.doesNotReject(entry.validate())

  assert.equal(entry.dayOfWeek, 1)
  assert.equal(entry.startTime, '09:00')
  assert.equal(entry.endTime, '10:00')
  assert.equal(entry.isActive, true)
})

test('requires course offering and faculty references', async () => {
  const entry = new TimetableEntry()

  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors.courseOfferingId)
    assert.ok(error.errors.facultyId)
    return true
  })
})

test('references CourseOffering and User models', () => {
  assert.equal(
    TimetableEntry.schema.path('courseOfferingId').options.ref,
    'CourseOffering',
  )

  assert.equal(TimetableEntry.schema.path('facultyId').options.ref, 'User')
})

test('accepts day values from zero through six', async () => {
  for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
    const entry = createValidEntry({ dayOfWeek })

    await assert.doesNotReject(entry.validate())
  }
})

test('rejects invalid day values', async () => {
  for (const dayOfWeek of [-1, 7, 1.5]) {
    const entry = createValidEntry({ dayOfWeek })

    await assert.rejects(entry.validate(), (error) => {
      assert.ok(error.errors.dayOfWeek)
      return true
    })
  }
})

test('rejects invalid time formats', async () => {
  for (const startTime of ['9:00', '25:00', '09:60', 'invalid']) {
    const entry = createValidEntry({ startTime })

    await assert.rejects(entry.validate(), (error) => {
      assert.ok(error.errors.startTime)
      return true
    })
  }
})

test('rejects end time earlier than start time', async () => {
  const entry = createValidEntry({
    startTime: '11:00',
    endTime: '10:00',
  })

  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors.endTime)
    return true
  })
})

test('rejects end time equal to start time', async () => {
  const entry = createValidEntry({
    startTime: '10:00',
    endTime: '10:00',
  })

  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors.endTime)
    return true
  })
})

test('accepts valid timetable modes', async () => {
  for (const mode of ['offline', 'online', 'hybrid']) {
    const entry = createValidEntry({ mode })

    await assert.doesNotReject(entry.validate())
  }
})

test('rejects an unsupported timetable mode', async () => {
  const entry = createValidEntry({ mode: 'recorded' })

  await assert.rejects(entry.validate(), (error) => {
    assert.ok(error.errors.mode)
    return true
  })
})

test('normalizes room and mode values', () => {
  const entry = createValidEntry({
    room: '  Room 202  ',
    mode: 'OFFLINE',
  })

  assert.equal(entry.room, 'Room 202')
  assert.equal(entry.mode, 'offline')
})

test('defines timetable lookup indexes', () => {
  const indexes = TimetableEntry.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.courseOfferingId === 1 &&
        fields.dayOfWeek === 1 &&
        fields.startTime === 1,
    ),
  )

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.facultyId === 1 &&
        fields.dayOfWeek === 1 &&
        fields.startTime === 1 &&
        fields.isActive === 1,
    ),
  )

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.room === 1 &&
        fields.dayOfWeek === 1 &&
        fields.startTime === 1 &&
        fields.isActive === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(TimetableEntry.schema.options.timestamps, true)
})
