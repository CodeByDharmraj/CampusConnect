const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const enrollmentController = require('../controllers/enrollmentController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles(ROLES.ADMIN))

// Load active students and active course offerings for the admin interface.
router.get('/options', enrollmentController.getEnrollmentOptions)

// List enrollment history for one course offering.
router.get(
  '/offerings/:offeringId',
  enrollmentController.getOfferingEnrollments,
)

// Add a student or reactivate their withdrawn enrollment.
router.post('/', enrollmentController.createEnrollment)

// Withdraw an active enrollment without deleting its history.
router.delete('/:enrollmentId', enrollmentController.withdrawEnrollment)

module.exports = router
