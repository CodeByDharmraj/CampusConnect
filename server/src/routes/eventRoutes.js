const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
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
const { validateEventId: validateAttendanceEventId, validateBulkAttendance } = require('../validation/eventAttendanceValidation')

const router = express.Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = validateEventQuery(req.query)
    const events = await eventService.getEvents(req.user, filters)
    return res.status(200).json({ success: true, data: { events } })
  }),
)

router.post(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const input = validateCreateEvent(req.body)
    const event = await eventService.createEvent(req.user, input)
    return res.status(201).json({
      success: true,
      message: 'Event draft created successfully.',
      data: { event },
    })
  }),
)

// Coordinator/admin participant roster and event attendance are declared before /:eventId.
router.get(
  '/:eventId/participants',
  authorizeRoles('coordinator', 'admin'),
  asyncHandler(async (req, res) => {
    const eventId = validateAttendanceEventId(req.params.eventId)
    const result = await eventAttendanceService.getEventParticipants(req.user, eventId)
    return res.status(200).json({ success: true, data: result })
  }),
)

router.put(
  '/:eventId/attendance',
  authorizeRoles('coordinator', 'admin'),
  asyncHandler(async (req, res) => {
    const eventId = validateAttendanceEventId(req.params.eventId)
    const { records } = validateBulkAttendance(req.body)
    const result = await eventAttendanceService.markEventAttendance(req.user, eventId, records)
    return res.status(200).json({
      success: true,
      message: 'Event attendance saved successfully.',
      data: result,
    })
  }),
)

// Student registration history is declared before /:eventId to keep the
// literal `registrations` segment unambiguous.
router.get(
  '/registrations/me',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const filters = validateMyRegistrationQuery(req.query)
    const registrations = await eventRegistrationService.getMyRegistrations(req.user, filters)
    return res.status(200).json({ success: true, data: { registrations } })
  }),
)

router.post(
  '/:eventId/registrations',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventRegistrationEventId(req.params.eventId)
    const registration = await eventRegistrationService.registerForEvent(req.user, eventId)
    return res.status(201).json({
      success: true,
      message: 'You are registered for this event.',
      data: { registration },
    })
  }),
)

router.delete(
  '/:eventId/registrations/me',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventRegistrationEventId(req.params.eventId)
    const registration = await eventRegistrationService.cancelRegistration(req.user, eventId)
    return res.status(200).json({
      success: true,
      message: 'Your event registration has been cancelled.',
      data: { registration },
    })
  }),
)

router.get(
  '/:eventId',
  asyncHandler(async (req, res) => {
    const eventId = validateEventId(req.params.eventId)
    const event = await eventService.getEventById(req.user, eventId)
    return res.status(200).json({ success: true, data: { event } })
  }),
)

router.patch(
  '/:eventId',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventId(req.params.eventId)
    const updates = validateUpdateEvent(req.body)
    const event = await eventService.updateEvent(req.user, eventId, updates)
    return res.status(200).json({
      success: true,
      message: 'Event draft updated successfully.',
      data: { event },
    })
  }),
)

router.patch(
  '/:eventId/publish',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventId(req.params.eventId)
    const event = await eventService.publishEvent(req.user, eventId)
    return res.status(200).json({
      success: true,
      message: 'Event published successfully.',
      data: { event },
    })
  }),
)

router.patch(
  '/:eventId/cancel',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventId(req.params.eventId)
    const { reason } = validateCancellation(req.body)
    const event = await eventService.cancelEvent(req.user, eventId, reason)
    return res.status(200).json({
      success: true,
      message: 'Event cancelled successfully.',
      data: { event },
    })
  }),
)

router.patch(
  '/:eventId/complete',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const eventId = validateEventId(req.params.eventId)
    const event = await eventService.completeEvent(req.user, eventId)
    return res.status(200).json({
      success: true,
      message: 'Event marked as completed.',
      data: { event },
    })
  }),
)

module.exports = router
