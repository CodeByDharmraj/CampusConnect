const express = require('express')

const asyncHandler = require('../utils/asyncHandler')
const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const attendanceFacultyService = require('../services/attendanceFacultyService')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles('faculty'))

// Assigned course offerings for attendance management.
router.get(
  '/options',
  asyncHandler(async (req, res) => {
    const result = await attendanceFacultyService.getFacultyAttendanceOptions(
      req.user,
    )

    res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

// Enrolled student roster for a selected course offering.
router.get(
  '/offerings/:courseOfferingId/roster',
  asyncHandler(async (req, res) => {
    const result = await attendanceFacultyService.getEnrolledRoster(
      req.user,
      req.params.courseOfferingId,
    )

    res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

// Create an attendance session.
router.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const result = await attendanceFacultyService.createAttendanceSession(
      req.user,
      req.body,
    )

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully.',
      data: result,
    })
  }),
)

module.exports = router
