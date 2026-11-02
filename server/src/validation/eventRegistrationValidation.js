const ApiError = require('../utils/ApiError')
const { validateEventId } = require('./eventValidation')

function validateMyRegistrationQuery(query) {
  if (Object.keys(query).some((key) => key !== 'status')) {
    throw new ApiError(400, 'Unsupported registration filter.', 'VALIDATION_ERROR')
  }

  if (query.status !== undefined && !['registered', 'cancelled'].includes(query.status)) {
    throw new ApiError(400, 'Registration status must be registered or cancelled.', 'VALIDATION_ERROR')
  }

  return query.status ? { status: query.status } : {}
}

module.exports = {
  validateEventRegistrationEventId: validateEventId,
  validateMyRegistrationQuery,
}
