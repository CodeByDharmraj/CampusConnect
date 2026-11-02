const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')
const attendanceService = require('../services/attendanceService')
const {
  validateSessionId,
  validateBulkAttendance,
} = require('../validation/attendanceValidation')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles('faculty'))

// Submit attendance for every actively enrolled student in an open session.
router.put(
  '/:sessionId/records',
  asyncHandler(async (req, res) => {
    const sessionId = validateSessionId(req.params.sessionId)
    const input = validateBulkAttendance(req.body)

    const session = await attendanceService.bulkMarkAttendance(
      req.user,
      sessionId,
      input,
    )

    return res.status(200).json({
      success: true,
      message: 'Attendance marked and session finalized successfully.',
      data: { session },
    })
  }),
)

module.exports = router
