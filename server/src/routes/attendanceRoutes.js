const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')

const attendanceService = require('../services/attendanceService')

const {
  validateCreateAttendanceSession,
  validateSessionId,
  validateRecordId,
  validateCorrectionRequest,
  validateReviewCorrection,
} = require('../validation/attendanceValidation')

const router = express.Router()

// Every attendance endpoint requires an authenticated active user.
router.use(authenticate)


router.get(
  '/options',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const options = await attendanceService.getFacultyAttendanceOptions(
      req.user,
    )

    return res.status(200).json({
      success: true,
      data: { options },
    })
  }),
)


// Student's own attendance history.
router.get(
  '/my',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const records = await attendanceService.getMyAttendance(req.user)

    return res.status(200).json({
      success: true,
      data: { records },
    })
  }),
)

// Role-scoped attendance overview.
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const overview = await attendanceService.getAttendanceOverview(req.user)

    return res.status(200).json({
      success: true,
      data: { overview },
    })
  }),
)

// List sessions visible to the current user.
router.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const filters = {
      courseOfferingId: req.query.courseOfferingId,
      from: req.query.from,
      to: req.query.to,
    }

    const sessions = await attendanceService.getAttendanceSessions(
      req.user,
      filters,
    )

    return res.status(200).json({
      success: true,
      data: { sessions },
    })
  }),
)

// Create a session and submit attendance.
// Only assigned faculty can do this.
router.post(
  '/sessions',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const input = validateCreateAttendanceSession(req.body)

    const session = await attendanceService.createAttendanceSession(
      req.user,
      input,
    )

    return res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully.',
      data: { session },
    })
  }),
)

// Retrieve correction requests visible to the user.
router.get(
  '/correction-requests',
  authorizeRoles('student', 'faculty', 'coordinator'),
  asyncHandler(async (req, res) => {
    const requests = await attendanceService.getCorrectionRequests(req.user)

    return res.status(200).json({
      success: true,
      data: { requests },
    })
  }),
)

// Student requests a correction to their own record.
router.post(
  '/records/:recordId/correction-requests',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const recordId = validateRecordId(req.params.recordId)
    const input = validateCorrectionRequest(req.body)

    const request = await attendanceService.createCorrectionRequest(
      req.user,
      recordId,
      input,
    )

    return res.status(201).json({
      success: true,
      message: 'Attendance correction request submitted.',
      data: { request },
    })
  }),
)

// Assigned faculty approves or rejects a correction.
router.patch(
  '/correction-requests/:requestId/review',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const requestId = validateSessionId(req.params.requestId)
    const input = validateReviewCorrection(req.body)

    const request = await attendanceService.reviewCorrectionRequest(
      req.user,
      requestId,
      input,
    )

    return res.status(200).json({
      success: true,
      message: `Correction request ${input.decision}.`,
      data: { request },
    })
  }),
)

// Retrieve one session and its records.
// This route must appear after the more specific routes above.
router.get(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const sessionId = validateSessionId(req.params.sessionId)

    const session = await attendanceService.getAttendanceSession(
      req.user,
      sessionId,
    )

    return res.status(200).json({
      success: true,
      data: { session },
    })
  }),
)

module.exports = router
