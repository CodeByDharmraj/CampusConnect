const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/
const SECTION_PATTERN = /^[A-Z0-9-]+$/

const CREATE_FIELDS = ['courseId', 'academicYear', 'semester', 'section']

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

function validateCreateCourseOffering(body) {
  requireObject(body)

  const unexpectedFields = Object.keys(body).filter(
    (field) => !CREATE_FIELDS.includes(field),
  )

  if (unexpectedFields.length > 0) {
    reject('Request contains unsupported fields.')
  }

  if (
    typeof body.courseId !== 'string' ||
    !OBJECT_ID_PATTERN.test(body.courseId)
  ) {
    reject('A valid course ID is required.')
  }

  if (typeof body.academicYear !== 'string') {
    reject('Academic year is required.')
  }

  const academicYear = body.academicYear.trim()
  const yearMatch = academicYear.match(ACADEMIC_YEAR_PATTERN)

  if (!yearMatch || Number(yearMatch[2]) !== Number(yearMatch[1]) + 1) {
    reject('Academic year must use consecutive years in YYYY-YYYY format.')
  }

  if (
    !Number.isInteger(body.semester) ||
    body.semester < 1 ||
    body.semester > 8
  ) {
    reject('Semester must be a whole number between 1 and 8.')
  }

  if (typeof body.section !== 'string') {
    reject('Section is required.')
  }

  const section = body.section.trim().toUpperCase()

  if (
    section.length < 1 ||
    section.length > 10 ||
    !SECTION_PATTERN.test(section)
  ) {
    reject('Section must contain 1 to 10 letters, numbers or hyphens.')
  }

  return {
    courseId: body.courseId,
    academicYear,
    semester: body.semester,
    section,
  }
}

module.exports = {
  validateCreateCourseOffering,
}
