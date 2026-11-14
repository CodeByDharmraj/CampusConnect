const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const timetableController = require('../controllers/timetableController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

// All timetable endpoints require an authenticated, active user.
router.use(authenticate)

// Retrieve timetable entries visible to the authenticated user.
// The service applies student, faculty, coordinator and admin scopes.
router.get('/', timetableController.getTimetableEntries)

// Retrieve one timetable entry.
// The service returns 404 when the entry is outside the user's scope.
router.get('/:entryId', timetableController.getTimetableEntry)

// Create a timetable entry.
// Only administrators and coordinators can manage timetable schedules.
// The service verifies coordinator department scope and faculty assignment.
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  timetableController.createTimetableEntry,
)

// Update an existing active timetable entry.
router.patch(
  '/:entryId',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  timetableController.updateTimetableEntry,
)

// Soft-deactivate a timetable entry.
// The original database document remains available for academic history.
router.patch(
  '/:entryId/deactivate',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  timetableController.deactivateTimetableEntry,
)

module.exports = router
