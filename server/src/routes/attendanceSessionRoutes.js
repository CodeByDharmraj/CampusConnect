const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const attendanceSessionController = require('../controllers/attendanceSessionController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles(ROLES.FACULTY))

// Submit attendance for every actively enrolled student in an open session.
router.put(
  '/:sessionId/records',
  attendanceSessionController.bulkMarkAttendance,
)

module.exports = router
