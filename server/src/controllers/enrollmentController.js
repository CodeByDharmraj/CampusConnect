const asyncHandler = require('../utils/asyncHandler')
const enrollmentService = require('../services/enrollmentService')
const {
  validateCreateEnrollment,
  validateOfferingId,
  validateEnrollmentId,
} = require('../validation/enrollmentValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getEnrollmentOptions = asyncHandler(async (req, res) => {
  const options = await enrollmentService.getEnrollmentOptions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: options,
  })
})

const getOfferingEnrollments = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingId(req.params.offeringId)
  const result = await enrollmentService.getOfferingEnrollments(
    req.user,
    offeringId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

const createEnrollment = asyncHandler(async (req, res) => {
  const input = validateCreateEnrollment(req.body)
  const enrollment = await enrollmentService.createEnrollment(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { enrollment },
  })
})

const withdrawEnrollment = asyncHandler(async (req, res) => {
  const enrollmentId = validateEnrollmentId(req.params.enrollmentId)
  const enrollment = await enrollmentService.withdrawEnrollment(
    req.user,
    enrollmentId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { enrollment },
  })
})

module.exports = {
  getEnrollmentOptions,
  getOfferingEnrollments,
  createEnrollment,
  withdrawEnrollment,
}
