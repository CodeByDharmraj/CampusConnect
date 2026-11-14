const asyncHandler = require('../utils/asyncHandler')
const facultyCourseService = require('../services/facultyCourseService')
const {
  validateAssignFaculty,
  validateOfferingId,
  validateFacultyId,
} = require('../validation/facultyCourseValidation')
const courseOfferingService = require('../services/courseOfferingService')
const reactivationService = require('../services/courseOfferingReactivationService')
const {
  validateCreateCourseOffering,
  validateOfferingParam,
  validateRequestParam,
  validateReasonBody,
} = require('../validation/courseOfferingValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getFacultyAssignmentOptions = asyncHandler(async (req, res) => {
  const options = await facultyCourseService.getFacultyAssignmentOptions(
    req.user,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: options,
  })
})

const createCourseOffering = asyncHandler(async (req, res) => {
  const input = validateCreateCourseOffering(req.body)

  const offering = await courseOfferingService.createCourseOffering(
    req.user,
    input,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { offering },
  })
})

const createFacultyAssignment = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingId(req.params.offeringId)
  const { facultyId } = validateAssignFaculty(req.body)

  const assignment = await facultyCourseService.createFacultyAssignment(
    req.user,
    offeringId,
    facultyId,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { assignment },
  })
})

const getFacultyAssignments = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingId(req.params.offeringId)

  const assignments = await facultyCourseService.getFacultyAssignments(
    req.user,
    offeringId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { assignments },
  })
})

const deactivateFacultyAssignment = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingId(req.params.offeringId)
  const facultyId = validateFacultyId(req.params.facultyId)

  const assignment = await facultyCourseService.deactivateFacultyAssignment(
    req.user,
    offeringId,
    facultyId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { assignment },
  })
})

const getCourseOfferings = asyncHandler(async (req, res) => {
  const offerings = await courseOfferingService.getCourseOfferings(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { offerings },
  })
})

const deactivateCourseOffering = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingParam(req.params.offeringId)

  const offering = await courseOfferingService.deactivateCourseOffering(
    req.user,
    offeringId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { offering },
  })
})

const getReactivationRequests = asyncHandler(async (req, res) => {
  const requests = await reactivationService.listReactivationRequests(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { requests },
  })
})

const createReactivationRequest = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingParam(req.params.offeringId)
  const reason = validateReasonBody(req.body)

  const request = await reactivationService.createReactivationRequest(
    req.user,
    offeringId,
    reason,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { request },
  })
})

const approveReactivationRequest = asyncHandler(async (req, res) => {
  const requestId = validateRequestParam(req.params.requestId)
  const reason = validateReasonBody(req.body)

  const request = await reactivationService.approveReactivationRequest(
    req.user,
    requestId,
    reason,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { request },
  })
})

const rejectReactivationRequest = asyncHandler(async (req, res) => {
  const requestId = validateRequestParam(req.params.requestId)
  const reason = validateReasonBody(req.body)

  const request = await reactivationService.rejectReactivationRequest(
    req.user,
    requestId,
    reason,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { request },
  })
})

module.exports = {
  getCourseOfferings,
  deactivateCourseOffering,
  getReactivationRequests,
  createReactivationRequest,
  approveReactivationRequest,
  rejectReactivationRequest,
  getFacultyAssignmentOptions,
  createCourseOffering,
  createFacultyAssignment,
  getFacultyAssignments,
  deactivateFacultyAssignment,
}
