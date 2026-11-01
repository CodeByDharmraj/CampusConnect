const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const CREATE_FIELDS = [
  'courseOfferingId',
  'facultyId',
  'dayOfWeek',
  'startTime',
  'endTime',
  'room',
  'mode',
]

const UPDATE_FIELDS = [
  'courseOfferingId',
  'facultyId',
  'dayOfWeek',
  'startTime',
  'endTime',
  'room',
  'mode',
]

const TIMETABLE_MODES = ['offline', 'online', 'hybrid']

function reject(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function requireObject(body) {
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    reject('Request body must be a JSON object.')
  }
}

function rejectUnexpectedFields(body, allowedFields) {
  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  )

  if (unexpectedFields.length > 0) {
    reject('Request contains unsupported fields.')
  }
}

function validateObjectId(value, fieldName) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject(`A valid ${fieldName} ID is required.`)
  }

  return value
}

function validateDayOfWeek(value) {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    reject('Day of week must be an integer between 0 and 6.')
  }

  return value
}

function validateTime(value, fieldName) {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    reject(`${fieldName} must use 24-hour HH:mm format.`)
  }

  return value
}

function validateRoom(value) {
  if (typeof value !== 'string') {
    reject('Room is required.')
  }

  const room = value.trim()

  if (room.length < 1 || room.length > 100) {
    reject('Room must contain between 1 and 100 characters.')
  }

  return room
}

function validateMode(value) {
  if (typeof value !== 'string') {
    reject('Timetable mode is required.')
  }

  const mode = value.trim().toLowerCase()

  if (!TIMETABLE_MODES.includes(mode)) {
    reject('Mode must be offline, online or hybrid.')
  }

  return mode
}

function validateTimeRange(startTime, endTime) {
  if (startTime >= endTime) {
    reject('End time must be later than start time.')
  }
}

function validateCreateTimetableEntry(body) {
  requireObject(body)
  rejectUnexpectedFields(body, CREATE_FIELDS)

  const fields = Object.keys(body)

  if (
    fields.length !== CREATE_FIELDS.length ||
    !CREATE_FIELDS.every((field) => Object.hasOwn(body, field))
  ) {
    reject('All timetable entry fields must be provided.')
  }

  const result = {
    courseOfferingId: validateObjectId(
      body.courseOfferingId,
      'course offering',
    ),
    facultyId: validateObjectId(body.facultyId, 'faculty'),
    dayOfWeek: validateDayOfWeek(body.dayOfWeek),
    startTime: validateTime(body.startTime, 'Start time'),
    endTime: validateTime(body.endTime, 'End time'),
    room: validateRoom(body.room),
    mode: validateMode(body.mode),
  }

  validateTimeRange(result.startTime, result.endTime)

  return result
}

function validateUpdateTimetableEntry(body) {
  requireObject(body)
  rejectUnexpectedFields(body, UPDATE_FIELDS)

  const fields = Object.keys(body)

  if (fields.length === 0) {
    reject('At least one timetable entry field must be provided.')
  }

  const result = {}

  if (Object.hasOwn(body, 'courseOfferingId')) {
    result.courseOfferingId = validateObjectId(
      body.courseOfferingId,
      'course offering',
    )
  }

  if (Object.hasOwn(body, 'facultyId')) {
    result.facultyId = validateObjectId(body.facultyId, 'faculty')
  }

  if (Object.hasOwn(body, 'dayOfWeek')) {
    result.dayOfWeek = validateDayOfWeek(body.dayOfWeek)
  }

  if (Object.hasOwn(body, 'startTime')) {
    result.startTime = validateTime(body.startTime, 'Start time')
  }

  if (Object.hasOwn(body, 'endTime')) {
    result.endTime = validateTime(body.endTime, 'End time')
  }

  if (Object.hasOwn(body, 'room')) {
    result.room = validateRoom(body.room)
  }

  if (Object.hasOwn(body, 'mode')) {
    result.mode = validateMode(body.mode)
  }

  if (result.startTime !== undefined && result.endTime !== undefined) {
    validateTimeRange(result.startTime, result.endTime)
  }

  return result
}

function validateTimetableEntryId(value) {
  return validateObjectId(value, 'timetable entry')
}

module.exports = {
  validateCreateTimetableEntry,
  validateUpdateTimetableEntry,
  validateTimetableEntryId,
}
