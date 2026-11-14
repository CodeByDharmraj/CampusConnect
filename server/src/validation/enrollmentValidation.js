const ApiError = require('../utils/ApiError')

function validateCreateEnrollment(body) {
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.getPrototypeOf(body) !== Object.prototype
  ) {
    throw new ApiError(
      400,
      'Request body must be a JSON object.',
      'VALIDATION_ERROR',
    )
  }

  const fields = Object.keys(body)

  if (
    fields.length !== 2 ||
    !fields.includes('studentId') ||
    !fields.includes('courseOfferingId')
  ) {
    throw new ApiError(
      400,
      'Provide only studentId and courseOfferingId.',
      'VALIDATION_ERROR',
    )
  }

  return {
    studentId: body.studentId,
    courseOfferingId: body.courseOfferingId,
  }
}

function validateOfferingId(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new ApiError(
      400,
      'A valid course offering ID is required.',
      'VALIDATION_ERROR',
    )
  }

  return value
}

function validateEnrollmentId(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    throw new ApiError(
      400,
      'A valid enrollment ID is required.',
      'VALIDATION_ERROR',
    )
  }

  return value
}

module.exports = {
  validateCreateEnrollment,
  validateOfferingId,
  validateEnrollmentId,
}
