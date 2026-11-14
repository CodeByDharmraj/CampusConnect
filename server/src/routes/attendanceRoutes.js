const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const attendanceController = require('../controllers/attendanceController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

// Every attendance endpoint requires an authenticated active user.
router.use(authenticate)

router.get(
  '/options',
  authorizeRoles(ROLES.FACULTY),
  attendanceController.getFacultyAttendanceOptions,
)

// Student's own attendance history.
router.get(
  '/my',
  authorizeRoles(ROLES.STUDENT),
  attendanceController.getMyAttendance,
)

// Role-scoped attendance overview.
router.get('/overview', attendanceController.getAttendanceOverview)

// List sessions visible to the current user.
router.get('/sessions', attendanceController.getAttendanceSessions)

// Create a session and submit attendance.
// Only assigned faculty can do this.
router.post(
  '/sessions',
  authorizeRoles(ROLES.FACULTY),
  attendanceController.createAttendanceSession,
)

// Retrieve correction requests visible to the user.
router.get(
  '/correction-requests',
  authorizeRoles(ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR),
  attendanceController.getCorrectionRequests,
)

// Student requests a correction to their own record.
router.post(
  '/records/:recordId/correction-requests',
  authorizeRoles(ROLES.STUDENT),
  attendanceController.createCorrectionRequest,
)

// Assigned faculty approves or rejects a correction.
router.patch(
  '/correction-requests/:requestId/review',
  authorizeRoles(ROLES.FACULTY),
  attendanceController.reviewCorrectionRequest,
)

// Retrieve one session and its records.
// This route must appear after the more specific routes above.
router.get('/sessions/:sessionId', attendanceController.getAttendanceSession)

module.exports = router
