const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const assignmentController = require('../controllers/assignmentController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

// Retrieve assignments visible to the authenticated user.
router.get('/', assignmentController.getAssignments)

// Retrieve one assignment within the user's visibility scope.
router.get('/:assignmentId', assignmentController.getAssignment)

// Create a draft. The owner is derived from req.user.
router.post(
  '/',
  authorizeRoles(ROLES.FACULTY),
  assignmentController.createAssignment,
)

// Update an assignment draft owned by the authenticated faculty member.
router.patch(
  '/:assignmentId',
  authorizeRoles(ROLES.FACULTY),
  assignmentController.updateAssignment,
)

// Publish an owned draft after deadline and ownership checks.
router.patch(
  '/:assignmentId/publish',
  authorizeRoles(ROLES.FACULTY),
  assignmentController.publishAssignment,
)

module.exports = router
