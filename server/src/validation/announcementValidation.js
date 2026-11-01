const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

const CATEGORIES = ['Academic', 'Campus', 'Course update', 'Teaching']

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

function validateCreateAnnouncement(body) {
  requireObject(body)

  const allowedFields = [
    'title',
    'detail',
    'category',
    'courseOfferingId',
    'expiresAt',
  ]

  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    reject('Request contains unsupported fields.')
  }

  if (typeof body.title !== 'string') {
    reject('Announcement title is required.')
  }

  const title = body.title.trim()

  if (title.length < 5 || title.length > 100) {
    reject('Title must contain between 5 and 100 characters.')
  }

  if (typeof body.detail !== 'string') {
    reject('Announcement details are required.')
  }

  const detail = body.detail.trim()

  if (detail.length < 10 || detail.length > 5000) {
    reject('Details must contain between 10 and 5000 characters.')
  }

  if (!CATEGORIES.includes(body.category)) {
    reject('Choose a valid announcement category.')
  }

  const result = {
    title,
    detail,
    category: body.category,
  }

  if (body.courseOfferingId !== undefined) {
    if (
      typeof body.courseOfferingId !== 'string' ||
      !OBJECT_ID_PATTERN.test(body.courseOfferingId)
    ) {
      reject('A valid course offering ID is required.')
    }

    result.courseOfferingId = body.courseOfferingId
  }

  if (
    body.expiresAt !== undefined &&
    body.expiresAt !== null &&
    body.expiresAt !== ''
  ) {
    if (
      typeof body.expiresAt !== 'string' ||
      Number.isNaN(Date.parse(body.expiresAt))
    ) {
      reject('A valid expiry date is required.')
    }

    result.expiresAt = new Date(body.expiresAt)

    if (result.expiresAt <= new Date()) {
      reject('Expiry date must be in the future.')
    }
  } else {
    result.expiresAt = null
  }

  return result
}

function validateAnnouncementId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject('A valid announcement ID is required.')
  }

  return value
}

module.exports = {
  validateCreateAnnouncement,
  validateAnnouncementId,
}
