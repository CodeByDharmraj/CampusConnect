const asyncHandler = require('../utils/asyncHandler')
const attendanceService = require('../services/attendanceService')
const {
  validateCreateAttendanceSession,
  validateSessionId,
  validateRecordId,
  validateCorrectionRequestId,
  validateCorrectionRequest,
  validateReviewCorrection,
} = require('../validation/attendanceValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getFacultyAttendanceOptions = asyncHandler(async (req, res) => {
  const options = await attendanceService.getFacultyAttendanceOptions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { options },
  })
})

const getMyAttendance = asyncHandler(async (req, res) => {
  const records = await attendanceService.getMyAttendance(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { records },
  })
})

const getAttendanceOverview = asyncHandler(async (req, res) => {
  const overview = await attendanceService.getAttendanceOverview(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { overview },
  })
})

const getAttendanceSessions = asyncHandler(async (req, res) => {
  const filters = {
    courseOfferingId: req.query.courseOfferingId,
    from: req.query.from,
    to: req.query.to,
  }

  const sessions = await attendanceService.getAttendanceSessions(
    req.user,
    filters,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { sessions },
  })
})

const createAttendanceSession = asyncHandler(async (req, res) => {
  const input = validateCreateAttendanceSession(req.body)

  const session = await attendanceService.createAttendanceSession(
    req.user,
    input,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Attendance recorded successfully.',
    data: { session },
  })
})

const getCorrectionRequests = asyncHandler(async (req, res) => {
  const requests = await attendanceService.getCorrectionRequests(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { requests },
  })
})

const createCorrectionRequest = asyncHandler(async (req, res) => {
  const recordId = validateRecordId(req.params.recordId)
  const input = validateCorrectionRequest(req.body)

  const request = await attendanceService.createCorrectionRequest(
    req.user,
    recordId,
    input,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Attendance correction request submitted.',
    data: { request },
  })
})

const reviewCorrectionRequest = asyncHandler(async (req, res) => {
  const requestId = validateCorrectionRequestId(req.params.requestId)
  const input = validateReviewCorrection(req.body)

  const request = await attendanceService.reviewCorrectionRequest(
    req.user,
    requestId,
    input,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Correction request ${input.decision}.`,
    data: { request },
  })
})

const getAttendanceSession = asyncHandler(async (req, res) => {
  const sessionId = validateSessionId(req.params.sessionId)

  const session = await attendanceService.getAttendanceSession(
    req.user,
    sessionId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { session },
  })
})

module.exports = {
  getFacultyAttendanceOptions,
  getMyAttendance,
  getAttendanceOverview,
  getAttendanceSessions,
  createAttendanceSession,
  getCorrectionRequests,
  createCorrectionRequest,
  reviewCorrectionRequest,
  getAttendanceSession,
}
