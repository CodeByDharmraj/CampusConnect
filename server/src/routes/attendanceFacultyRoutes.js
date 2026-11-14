const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const attendanceFacultyController = require('../controllers/attendanceFacultyController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles(ROLES.FACULTY))

// Assigned course offerings for attendance management.
router.get('/options', attendanceFacultyController.getFacultyAttendanceOptions)

// Enrolled student roster for a selected course offering.
router.get(
  '/offerings/:courseOfferingId/roster',
  attendanceFacultyController.getEnrolledRoster,
)

// Create an attendance session.
router.post('/sessions', attendanceFacultyController.createAttendanceSession)

module.exports = router
