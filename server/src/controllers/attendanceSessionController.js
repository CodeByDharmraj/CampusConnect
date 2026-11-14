const asyncHandler = require('../utils/asyncHandler')
const attendanceService = require('../services/attendanceService')
const {
  validateSessionId,
  validateBulkAttendance,
} = require('../validation/attendanceValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const sessionId = validateSessionId(req.params.sessionId)
  const input = validateBulkAttendance(req.body)

  const session = await attendanceService.bulkMarkAttendance(
    req.user,
    sessionId,
    input,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Attendance marked and session finalized successfully.',
    data: { session },
  })
})

module.exports = {
  bulkMarkAttendance,
}
