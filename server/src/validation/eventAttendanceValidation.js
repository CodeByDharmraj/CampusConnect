const ApiError = require('../utils/ApiError')
const { EVENT_ATTENDANCE_STATUSES } = require('../models/EventAttendance')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

function reject(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function validateEventId(value) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject('A valid event ID is required.')
  }
  return value
}

function validateBulkAttendance(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.getPrototypeOf(body) !== Object.prototype) {
    reject('Request body must be a JSON object.')
  }
  if (Object.keys(body).some((key) => key !== 'records')) {
    reject('Request contains unsupported fields.')
  }
  if (!Array.isArray(body.records) || body.records.length < 1 || body.records.length > 500) {
    reject('Provide between 1 and 500 attendance records.')
  }

  const seen = new Set()
  const records = body.records.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).some((key) => !['studentId', 'status'].includes(key))) {
      reject('Each attendance record must contain only studentId and status.')
    }
    if (typeof record.studentId !== 'string' || !OBJECT_ID_PATTERN.test(record.studentId)) {
      reject('Each attendance record requires a valid student ID.')
    }
    if (seen.has(record.studentId)) reject('A student can appear only once in a submission.')
    seen.add(record.studentId)
    if (!EVENT_ATTENDANCE_STATUSES.includes(record.status)) {
      reject('Attendance status must be present or absent.')
    }
    return { studentId: record.studentId, status: record.status }
  })

  return { records }
}

module.exports = { validateEventId, validateBulkAttendance }
