const asyncHandler = require('../utils/asyncHandler')
const eventService = require('../services/eventService')
const eventRegistrationService = require('../services/eventRegistrationService')
const eventAttendanceService = require('../services/eventAttendanceService')
const {
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
  validateEventQuery,
  validateCancellation,
} = require('../validation/eventValidation')
const {
  validateEventRegistrationEventId,
  validateMyRegistrationQuery,
} = require('../validation/eventRegistrationValidation')
const {
  validateEventId: validateAttendanceEventId,
  validateBulkAttendance,
} = require('../validation/eventAttendanceValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getEvents = asyncHandler(async (req, res) => {
  const filters = validateEventQuery(req.query)
  const events = await eventService.getEvents(req.user, filters)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { events } })
})

const createEvent = asyncHandler(async (req, res) => {
  const input = validateCreateEvent(req.body)
  const event = await eventService.createEvent(req.user, input)
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Event draft created successfully.',
    data: { event },
  })
})

const getEventParticipants = asyncHandler(async (req, res) => {
  const eventId = validateAttendanceEventId(req.params.eventId)
  const result = await eventAttendanceService.getEventParticipants(
    req.user,
    eventId,
  )
  return res.status(HTTP_STATUS.OK).json({ success: true, data: result })
})

const markEventAttendance = asyncHandler(async (req, res) => {
  const eventId = validateAttendanceEventId(req.params.eventId)
  const { records } = validateBulkAttendance(req.body)
  const result = await eventAttendanceService.markEventAttendance(
    req.user,
    eventId,
    records,
  )
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Event attendance saved successfully.',
    data: result,
  })
})

const getMyRegistrations = asyncHandler(async (req, res) => {
  const filters = validateMyRegistrationQuery(req.query)
  const registrations = await eventRegistrationService.getMyRegistrations(
    req.user,
    filters,
  )
  return res
    .status(HTTP_STATUS.OK)
    .json({ success: true, data: { registrations } })
})

const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventRegistrationEventId(req.params.eventId)
  const registration = await eventRegistrationService.registerForEvent(
    req.user,
    eventId,
  )
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'You are registered for this event.',
    data: { registration },
  })
})

const cancelRegistration = asyncHandler(async (req, res) => {
  const eventId = validateEventRegistrationEventId(req.params.eventId)
  const registration = await eventRegistrationService.cancelRegistration(
    req.user,
    eventId,
  )
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Your event registration has been cancelled.',
    data: { registration },
  })
})

const getEventById = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.eventId)
  const event = await eventService.getEventById(req.user, eventId)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { event } })
})

const updateEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.eventId)
  const updates = validateUpdateEvent(req.body)
  const event = await eventService.updateEvent(req.user, eventId, updates)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Event draft updated successfully.',
    data: { event },
  })
})

const publishEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.eventId)
  const event = await eventService.publishEvent(req.user, eventId)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Event published successfully.',
    data: { event },
  })
})

const cancelEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.eventId)
  const { reason } = validateCancellation(req.body)
  const event = await eventService.cancelEvent(req.user, eventId, reason)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Event cancelled successfully.',
    data: { event },
  })
})

const completeEvent = asyncHandler(async (req, res) => {
  const eventId = validateEventId(req.params.eventId)
  const event = await eventService.completeEvent(req.user, eventId)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Event marked as completed.',
    data: { event },
  })
})

module.exports = {
  getEvents,
  createEvent,
  getEventParticipants,
  markEventAttendance,
  getMyRegistrations,
  registerForEvent,
  cancelRegistration,
  getEventById,
  updateEvent,
  publishEvent,
  cancelEvent,
  completeEvent,
}
