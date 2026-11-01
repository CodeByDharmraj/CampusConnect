const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const timetableService = require('../services/timetableService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateTimetableEntry,
  validateUpdateTimetableEntry,
  validateTimetableEntryId,
} = require('../validation/timetableValidation')

const router = express.Router()

// All timetable endpoints require an authenticated, active user.
router.use(authenticate)

// Retrieve timetable entries visible to the authenticated user.
// The service applies student, faculty, coordinator and admin scopes.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const entries = await timetableService.getTimetableEntries(req.user)

    return res.status(200).json({
      success: true,
      data: { entries },
    })
  }),
)

// Retrieve one timetable entry.
// The service returns 404 when the entry is outside the user's scope.
router.get(
  '/:entryId',
  asyncHandler(async (req, res) => {
    const entryId = validateTimetableEntryId(req.params.entryId)

    const entry = await timetableService.getTimetableEntry(req.user, entryId)

    return res.status(200).json({
      success: true,
      data: { entry },
    })
  }),
)

// Create a timetable entry.
// Only administrators and coordinators can manage timetable schedules.
// The service verifies coordinator department scope and faculty assignment.
router.post(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const input = validateCreateTimetableEntry(req.body)

    const entry = await timetableService.createTimetableEntry(req.user, input)

    return res.status(201).json({
      success: true,
      message: 'Timetable entry created successfully.',
      data: { entry },
    })
  }),
)

// Update an existing active timetable entry.
router.patch(
  '/:entryId',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const entryId = validateTimetableEntryId(req.params.entryId)
    const updates = validateUpdateTimetableEntry(req.body)

    const entry = await timetableService.updateTimetableEntry(
      req.user,
      entryId,
      updates,
    )

    return res.status(200).json({
      success: true,
      message: 'Timetable entry updated successfully.',
      data: { entry },
    })
  }),
)

// Soft-deactivate a timetable entry.
// The original database document remains available for academic history.
router.patch(
  '/:entryId/deactivate',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const entryId = validateTimetableEntryId(req.params.entryId)

    const entry = await timetableService.deactivateTimetableEntry(
      req.user,
      entryId,
    )

    return res.status(200).json({
      success: true,
      message: 'Timetable entry deactivated successfully.',
      data: { entry },
    })
  }),
)

module.exports = router
