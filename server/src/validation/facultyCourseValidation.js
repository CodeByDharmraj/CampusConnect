const ApiError = require('../utils/ApiError')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

function reject(message) {
  throw new ApiError(400, message, 'VALIDATION_ERROR')
}

function validateObjectId(value, fieldName) {
  if (typeof value !== 'string' || !OBJECT_ID_PATTERN.test(value)) {
    reject(`A valid ${fieldName} is required.`)
  }

  return value
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

function validateAssignFaculty(body) {
  requireObject(body)

  const fields = Object.keys(body)

  if (fields.length !== 1 || fields[0] !== 'facultyId') {
    reject('Request must contain only the facultyId field.')
  }

  return {
    facultyId: validateObjectId(body.facultyId, 'faculty ID'),
  }
}

function validateOfferingId(offeringId) {
  return validateObjectId(offeringId, 'course offering ID')
}

function validateFacultyId(facultyId) {
  return validateObjectId(facultyId, 'faculty ID')
}

module.exports = {
  validateAssignFaculty,
  validateOfferingId,
  validateFacultyId,
}
