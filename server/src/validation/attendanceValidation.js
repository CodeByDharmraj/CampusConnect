const mongoose = require('mongoose')
const ApiError = require('../utils/ApiError')

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused']

function fail(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    fail(`${fieldName} must be a valid ID.`)
  }

  return value
}

function validateDate(value, fieldName = 'Session date') {
  const date = new Date(value)

  if (!value || Number.isNaN(date.getTime())) {
    fail(`${fieldName} must be a valid date.`)
  }

  return date
}

function validateTime(value, fieldName) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    fail(`${fieldName} must use HH:mm format.`)
  }

  return value
}

function validateCreateAttendanceSession(body = {}) {
  const allowedFields = [
    'courseOfferingId',
    'timetableEntryId',
    'sessionDate',
    'startTime',
    'endTime',
    'topic',
    'notes',
    'attendance',
  ]

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      fail(`Unknown field: ${field}.`)
    }
  }

  const courseOfferingId = validateObjectId(
    body.courseOfferingId,
    'Course offering ID',
  )

  const sessionDate = validateDate(body.sessionDate)

  const startTime = validateTime(body.startTime, 'Start time')

  const endTime = body.endTime ? validateTime(body.endTime, 'End time') : null

  if (endTime && endTime <= startTime) {
    fail('End time must be later than start time.')
  }

  if (
    body.timetableEntryId &&
    !mongoose.isValidObjectId(body.timetableEntryId)
  ) {
    fail('Timetable entry ID must be valid.')
  }

  if (
    typeof body.topic !== 'undefined' &&
    (typeof body.topic !== 'string' || body.topic.trim().length > 200)
  ) {
    fail('Topic must be a string of at most 200 characters.')
  }

  if (
    typeof body.notes !== 'undefined' &&
    (typeof body.notes !== 'string' || body.notes.trim().length > 1000)
  ) {
    fail('Notes must be a string of at most 1000 characters.')
  }

  if (!Array.isArray(body.attendance) || body.attendance.length === 0) {
    fail('Attendance must contain at least one student.')
  }

  const seenStudents = new Set()

  const attendance = body.attendance.map((item) => {
    if (!item || typeof item !== 'object') {
      fail('Each attendance entry must be an object.')
    }

    const studentId = validateObjectId(item.studentId, 'Student ID')

    if (seenStudents.has(String(studentId))) {
      fail('A student cannot appear more than once in a session.')
    }

    seenStudents.add(String(studentId))

    if (!ATTENDANCE_STATUSES.includes(item.status)) {
      fail(
        `Attendance status must be one of: ${ATTENDANCE_STATUSES.join(', ')}.`,
      )
    }

    return { studentId, status: item.status }
  })

  return {
    courseOfferingId,
    timetableEntryId: body.timetableEntryId || null,
    sessionDate,
    startTime,
    endTime,
    topic: body.topic?.trim() || '',
    notes: body.notes?.trim() || '',
    attendance,
  }
}

function validateSessionId(sessionId) {
  return validateObjectId(sessionId, 'Attendance session ID')
}

function validateRecordId(recordId) {
  return validateObjectId(recordId, 'Attendance record ID')
}

function validateCorrectionRequest(body = {}) {
  const allowedFields = ['requestedStatus', 'reason']

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      fail(`Unknown field: ${field}.`)
    }
  }

  if (!ATTENDANCE_STATUSES.includes(body.requestedStatus)) {
    fail('A valid requested attendance status is required.')
  }

  if (
    typeof body.reason !== 'string' ||
    body.reason.trim().length < 10 ||
    body.reason.trim().length > 1000
  ) {
    fail('Correction reason must contain between 10 and 1000 characters.')
  }

  return {
    requestedStatus: body.requestedStatus,
    reason: body.reason.trim(),
  }
}

function validateReviewCorrection(body = {}) {
  const allowedFields = ['decision', 'reviewRemarks']

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      fail(`Unknown field: ${field}.`)
    }
  }

  if (!['approved', 'rejected'].includes(body.decision)) {
    fail('Decision must be approved or rejected.')
  }

  if (
    typeof body.reviewRemarks !== 'undefined' &&
    (typeof body.reviewRemarks !== 'string' ||
      body.reviewRemarks.trim().length > 1000)
  ) {
    fail('Review remarks cannot exceed 1000 characters.')
  }

  return {
    decision: body.decision,
    reviewRemarks: body.reviewRemarks?.trim() || '',
  }
}

module.exports = {
  validateCreateAttendanceSession,
  validateSessionId,
  validateRecordId,
  validateCorrectionRequest,
  validateReviewCorrection,
}
