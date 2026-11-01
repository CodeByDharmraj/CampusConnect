const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const assignmentService = require('../services/assignmentService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateAssignment,
  validateUpdateAssignment,
  validateAssignmentId,
} = require('../validation/assignmentValidation')

const router = express.Router()

router.use(authenticate)

// Retrieve assignments visible to the authenticated user.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const assignments = await assignmentService.getAssignments(req.user)

    return res.status(200).json({
      success: true,
      data: { assignments },
    })
  }),
)

// Retrieve one assignment within the user's visibility scope.
router.get(
  '/:assignmentId',
  asyncHandler(async (req, res) => {
    const assignmentId = validateAssignmentId(req.params.assignmentId)

    const assignment = await assignmentService.getAssignment(
      req.user,
      assignmentId,
    )

    return res.status(200).json({
      success: true,
      data: { assignment },
    })
  }),
)

// Create a draft. The owner is derived from req.user.
router.post(
  '/',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const input = validateCreateAssignment(req.body)

    const assignment = await assignmentService.createAssignment(req.user, input)

    return res.status(201).json({
      success: true,
      message: 'Assignment draft created successfully.',
      data: { assignment },
    })
  }),
)

// Update an assignment draft owned by the authenticated faculty member.
router.patch(
  '/:assignmentId',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const assignmentId = validateAssignmentId(req.params.assignmentId)
    const updates = validateUpdateAssignment(req.body)

    const assignment = await assignmentService.updateAssignment(
      req.user,
      assignmentId,
      updates,
    )

    return res.status(200).json({
      success: true,
      message: 'Assignment draft updated successfully.',
      data: { assignment },
    })
  }),
)

// Publish an owned draft after deadline and ownership checks.
router.patch(
  '/:assignmentId/publish',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const assignmentId = validateAssignmentId(req.params.assignmentId)

    const assignment = await assignmentService.publishAssignment(
      req.user,
      assignmentId,
    )

    return res.status(200).json({
      success: true,
      message: 'Assignment published successfully.',
      data: { assignment },
    })
  }),
)

module.exports = router
