const ApiError = require('../utils/ApiError')
const { EVENT_CATEGORIES } = require('../models/Event')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const CREATE_FIELDS = [
  'title',
  'description',
  'category',
  'clubId',
  'departmentId',
  'startsAt',
  'endsAt',
  'venue',
  'capacity',
  'registrationOpensAt',
  'registrationClosesAt',
]
const UPDATE_FIELDS = CREATE_FIELDS.filter(
  (field) => !['clubId', 'departmentId'].includes(field),
)

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
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    reject('Request contains unsupported fields.')
  }
}

function validateText(value, field, min, max) {
  if (typeof value !== 'string') reject(`${field} is required.`)
  const normalized = value.trim()
  if (normalized.length < min || normalized.length > max) {
    reject(`${field} must contain between ${min} and ${max} characters.`)
  }
  return normalized
}

function validateObjectId(value, field) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject(`A valid ${field} ID is required.`)
  }
  return value
}

function validateDate(value, field, nullable = false) {
  if (nullable && (value === null || value === '')) return null
  if (typeof value !== 'string' && !(value instanceof Date)) {
    reject(`${field} must be a valid date.`)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) reject(`${field} must be a valid date.`)
  return date
}

function validateCategory(value) {
  if (!EVENT_CATEGORIES.includes(value)) reject('Choose a valid event category.')
  return value
}

function validateCapacity(value) {
  if (value === null || value === '') return null
  const capacity = Number(value)
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
    reject('Capacity must be a whole number between 1 and 100000, or null for unlimited.')
  }
  return capacity
}

function validateCreateEvent(body) {
  requireObject(body)
  rejectUnexpectedFields(body, CREATE_FIELDS)

  const result = {
    title: validateText(body.title, 'Event title', 5, 150),
    description: validateText(body.description, 'Event description', 20, 10000),
    category: validateCategory(body.category),
    clubId: validateObjectId(body.clubId, 'club'),
    startsAt: validateDate(body.startsAt, 'Event start time'),
    endsAt: validateDate(body.endsAt, 'Event end time'),
    venue: validateText(body.venue, 'Venue', 2, 200),
  }

  if (Object.hasOwn(body, 'departmentId')) {
    result.departmentId = validateObjectId(body.departmentId, 'department')
  }
  if (Object.hasOwn(body, 'capacity')) result.capacity = validateCapacity(body.capacity)
  if (Object.hasOwn(body, 'registrationOpensAt')) {
    result.registrationOpensAt = validateDate(
      body.registrationOpensAt,
      'Registration opening time',
      true,
    )
  }
  if (Object.hasOwn(body, 'registrationClosesAt')) {
    result.registrationClosesAt = validateDate(
      body.registrationClosesAt,
      'Registration closing time',
      true,
    )
  }

  validateTimeline(result)
  return result
}

function validateTimeline(input) {
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    reject('Event end time must be after its start time.')
  }
  if (
    input.registrationOpensAt &&
    input.registrationClosesAt &&
    input.registrationClosesAt <= input.registrationOpensAt
  ) {
    reject('Registration closing time must be after its opening time.')
  }
  if (
    input.registrationClosesAt &&
    input.startsAt &&
    input.registrationClosesAt > input.startsAt
  ) {
    reject('Registration must close before the event starts.')
  }
  if (
    input.registrationOpensAt &&
    input.startsAt &&
    input.registrationOpensAt >= input.startsAt
  ) {
    reject('Registration must open before the event starts.')
  }
}

function validateUpdateEvent(body) {
  requireObject(body)
  rejectUnexpectedFields(body, UPDATE_FIELDS)
  if (Object.keys(body).length === 0) reject('At least one event field must be provided.')

  const result = {}
  if (Object.hasOwn(body, 'title')) result.title = validateText(body.title, 'Event title', 5, 150)
  if (Object.hasOwn(body, 'description')) {
    result.description = validateText(body.description, 'Event description', 20, 10000)
  }
  if (Object.hasOwn(body, 'category')) result.category = validateCategory(body.category)
  if (Object.hasOwn(body, 'startsAt')) result.startsAt = validateDate(body.startsAt, 'Event start time')
  if (Object.hasOwn(body, 'endsAt')) result.endsAt = validateDate(body.endsAt, 'Event end time')
  if (Object.hasOwn(body, 'venue')) result.venue = validateText(body.venue, 'Venue', 2, 200)
  if (Object.hasOwn(body, 'capacity')) result.capacity = validateCapacity(body.capacity)
  if (Object.hasOwn(body, 'registrationOpensAt')) {
    result.registrationOpensAt = validateDate(
      body.registrationOpensAt,
      'Registration opening time',
      true,
    )
  }
  if (Object.hasOwn(body, 'registrationClosesAt')) {
    result.registrationClosesAt = validateDate(
      body.registrationClosesAt,
      'Registration closing time',
      true,
    )
  }

  validateTimeline(result)
  return result
}

function validateEventId(value) {
  return validateObjectId(value, 'event')
}

function validateEventQuery(query) {
  const allowed = ['q', 'category', 'status', 'clubId', 'departmentId', 'upcoming']
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    reject('Unsupported event filter.')
  }

  const result = {}
  if (query.q !== undefined) {
    if (typeof query.q !== 'string' || query.q.trim().length > 100) {
      reject('Event search must be 100 characters or fewer.')
    }
    result.q = query.q.trim()
  }
  if (query.category !== undefined) result.category = validateCategory(query.category)
  if (query.status !== undefined) {
    if (!['draft', 'published', 'cancelled', 'completed'].includes(query.status)) {
      reject('Choose a valid event status.')
    }
    result.status = query.status
  }
  if (query.clubId !== undefined) result.clubId = validateObjectId(query.clubId, 'club')
  if (query.departmentId !== undefined) {
    result.departmentId = validateObjectId(query.departmentId, 'department')
  }
  if (query.upcoming !== undefined) {
    if (!['true', 'false'].includes(query.upcoming)) reject('Upcoming must be true or false.')
    result.upcoming = query.upcoming === 'true'
  }
  return result
}

function validateCancellation(body) {
  requireObject(body)
  rejectUnexpectedFields(body, ['reason'])
  if (body.reason === undefined || body.reason === '') return { reason: '' }
  return { reason: validateText(body.reason, 'Cancellation reason', 3, 500) }
}

module.exports = {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
  validateEventQuery,
  validateCancellation,
}
