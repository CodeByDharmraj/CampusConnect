const asyncHandler = require('../utils/asyncHandler')
const attendanceFacultyService = require('../services/attendanceFacultyService')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getFacultyAttendanceOptions = asyncHandler(async (req, res) => {
  const result = await attendanceFacultyService.getFacultyAttendanceOptions(
    req.user,
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

const getEnrolledRoster = asyncHandler(async (req, res) => {
  const result = await attendanceFacultyService.getEnrolledRoster(
    req.user,
    req.params.courseOfferingId,
  )

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

const createAttendanceSession = asyncHandler(async (req, res) => {
  const result = await attendanceFacultyService.createAttendanceSession(
    req.user,
    req.body,
  )

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Attendance session created successfully.',
    data: result,
  })
})

module.exports = {
  getFacultyAttendanceOptions,
  getEnrolledRoster,
  createAttendanceSession,
}
