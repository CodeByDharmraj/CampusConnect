const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const facultyCourseService = require('../services/facultyCourseService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateAssignFaculty,
  validateOfferingId,
  validateFacultyId,
} = require('../validation/facultyCourseValidation')

const courseOfferingService = require('../services/courseOfferingService')

const {
  validateCreateCourseOffering,
} = require('../validation/courseOfferingValidation')

const router = express.Router()

router.use(authenticate)

// Return active offerings and faculty accounts for assignment management.
router.get(
  '/options',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const options = await facultyCourseService.getFacultyAssignmentOptions(
      req.user,
    )

    return res.status(200).json({
      success: true,
      data: options,
    })
  }),
)

// Create a new offering for an active course.
router.post(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const input = validateCreateCourseOffering(req.body)

    const offering = await courseOfferingService.createCourseOffering(
      req.user,
      input,
    )

    return res.status(201).json({
      success: true,
      data: { offering },
    })
  }),
)

// Assign a faculty member to an active course offering.
router.post(
  '/:offeringId/faculty',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const offeringId = validateOfferingId(req.params.offeringId)
    const { facultyId } = validateAssignFaculty(req.body)

    const assignment = await facultyCourseService.createFacultyAssignment(
      req.user,
      offeringId,
      facultyId,
    )

    return res.status(201).json({
      success: true,
      data: { assignment },
    })
  }),
)

// List assignments for an offering.
// Administrators and coordinators see history; faculty see their own active assignment.
router.get(
  '/:offeringId/faculty',
  authorizeRoles('admin', 'coordinator', 'faculty'),
  asyncHandler(async (req, res) => {
    const offeringId = validateOfferingId(req.params.offeringId)

    const assignments = await facultyCourseService.getFacultyAssignments(
      req.user,
      offeringId,
    )

    return res.status(200).json({
      success: true,
      data: { assignments },
    })
  }),
)

// Deactivate an assignment without deleting its history.
router.delete(
  '/:offeringId/faculty/:facultyId',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const offeringId = validateOfferingId(req.params.offeringId)
    const facultyId = validateFacultyId(req.params.facultyId)

    const assignment = await facultyCourseService.deactivateFacultyAssignment(
      req.user,
      offeringId,
      facultyId,
    )

    return res.status(200).json({
      success: true,
      data: { assignment },
    })
  }),
)

module.exports = router
