const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const eventController = require('../controllers/eventController')
const { ROLES } = require('../constants/roles')

const router = express.Router()
router.use(authenticate)

router.get('/', eventController.getEvents)

router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  eventController.createEvent,
)

// Coordinator/admin participant roster and event attendance are declared before /:eventId.
router.get(
  '/:eventId/participants',
  authorizeRoles(ROLES.COORDINATOR, ROLES.ADMIN),
  eventController.getEventParticipants,
)

router.put(
  '/:eventId/attendance',
  authorizeRoles(ROLES.COORDINATOR, ROLES.ADMIN),
  eventController.markEventAttendance,
)

// Student registration history is declared before /:eventId to keep the
// literal `registrations` segment unambiguous.
router.get(
  '/registrations/me',
  authorizeRoles(ROLES.STUDENT),
  eventController.getMyRegistrations,
)

router.post(
  '/:eventId/registrations',
  authorizeRoles(ROLES.STUDENT),
  eventController.registerForEvent,
)

router.delete(
  '/:eventId/registrations/me',
  authorizeRoles(ROLES.STUDENT),
  eventController.cancelRegistration,
)

router.get('/:eventId', eventController.getEventById)

router.patch(
  '/:eventId',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  eventController.updateEvent,
)

router.patch(
  '/:eventId/publish',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  eventController.publishEvent,
)

router.patch(
  '/:eventId/cancel',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  eventController.cancelEvent,
)

router.patch(
  '/:eventId/complete',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  eventController.completeEvent,
)

module.exports = router
