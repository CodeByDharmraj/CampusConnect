const asyncHandler = require('../utils/asyncHandler')
const submissionService = require('../services/submissionService')
const {
  validateUploadRequest,
  validateCompleteRequest,
  validateAssignmentId,
  validateSubmissionId,
  validateFileIndex,
  validateEvaluation,
} = require('../validation/submissionValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const createUploadUrl = asyncHandler(async (req, res) => {
  const input = validateUploadRequest(req.body)

  const result = await submissionService.createUploadUrl(req.user, input)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Upload URL created successfully.',
    data: result,
  })
})

const completeSubmission = asyncHandler(async (req, res) => {
  const input = validateCompleteRequest(req.body)

  const submission = await submissionService.completeSubmission(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Assignment submitted successfully.',
    data: { submission },
  })
})

const getMySubmissions = asyncHandler(async (req, res) => {
  const submissions = await submissionService.getMySubmissions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submissions },
  })
})

const getDepartmentSubmissions = asyncHandler(async (req, res) => {
  const result = await submissionService.getDepartmentSubmissions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

const getInstitutionSubmissions = asyncHandler(async (req, res) => {
  const result = await submissionService.getInstitutionSubmissions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const assignmentId = validateAssignmentId(req.params.assignmentId)

  const submissions = await submissionService.getAssignmentSubmissions(
    req.user,
    assignmentId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { submissions },
  })
})

const evaluateSubmission = asyncHandler(async (req, res) => {
  const submissionId = validateSubmissionId(req.params.submissionId)

  const input = validateEvaluation(req.body)

  const submission = await submissionService.evaluateSubmission(
    req.user,
    submissionId,
    input,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Submission evaluated successfully.',
    data: { submission },
  })
})

const createSubmissionDownloadUrl = asyncHandler(async (req, res) => {
  const submissionId = validateSubmissionId(req.params.submissionId)

  const fileIndex = validateFileIndex(req.query.fileIndex)

  const result = await submissionService.createSubmissionDownloadUrl(
    req.user,
    submissionId,
    fileIndex,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: result,
  })
})

module.exports = {
  createUploadUrl,
  completeSubmission,
  getMySubmissions,
  getDepartmentSubmissions,
  getInstitutionSubmissions,
  getAssignmentSubmissions,
  evaluateSubmission,
  createSubmissionDownloadUrl,
}
