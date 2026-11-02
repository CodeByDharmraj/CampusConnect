const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const submissionService = require('../services/submissionService')
const asyncHandler = require('../utils/asyncHandler')
const ApiError = require('../utils/ApiError')

const {
  validateUploadRequest,
  validateCompleteRequest,
  validateAssignmentId,
  validateSubmissionId,
  validateEvaluation,
} = require('../validation/submissionValidation')

const router = express.Router()

router.use(authenticate)

// Generate a short-lived upload URL for an enrolled student.
router.post(
  '/upload-url',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const input = validateUploadRequest(req.body)

    const result = await submissionService.createUploadUrl(req.user, input)

    return res.status(200).json({
      success: true,
      message: 'Upload URL created successfully.',
      data: result,
    })
  }),
)

// Confirm an upload and save the submission in MongoDB.
router.post(
  '/complete',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const input = validateCompleteRequest(req.body)

    const submission = await submissionService.completeSubmission(
      req.user,
      input,
    )

    return res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully.',
      data: { submission },
    })
  }),
)

// Retrieve the authenticated student's submission history.
router.get(
  '/my',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const submissions = await submissionService.getMySubmissions(req.user)

    return res.status(200).json({
      success: true,
      data: { submissions },
    })
  }),
)

// Coordinator views submissions belonging to their department.
router.get(
  '/department',
  authorizeRoles('coordinator'),
  asyncHandler(async (req, res) => {
    const result = await submissionService.getDepartmentSubmissions(
      req.user,
    )

    return res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

// Admin views submissions across the institution.
router.get(
  '/institution',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const result = await submissionService.getInstitutionSubmissions(
      req.user,
    )

    return res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

// Faculty retrieves submissions for an assignment they own.
router.get(
  '/assignment/:assignmentId',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const assignmentId = validateAssignmentId(req.params.assignmentId)

    const submissions = await submissionService.getAssignmentSubmissions(
      req.user,
      assignmentId,
    )

    return res.status(200).json({
      success: true,
      data: { submissions },
    })
  }),
)

// Faculty evaluates a student's latest submission.
router.patch(
  '/:submissionId/evaluate',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const submissionId = validateSubmissionId(req.params.submissionId)

    const input = validateEvaluation(req.body)

    const submission = await submissionService.evaluateSubmission(
      req.user,
      submissionId,
      input,
    )

    return res.status(200).json({
      success: true,
      message: 'Submission evaluated successfully.',
      data: { submission },
    })
  }),
)

// Generate an authorized, temporary download URL.
router.get(
  '/:submissionId/download-url',
  authorizeRoles('student', 'faculty'),
  asyncHandler(async (req, res) => {
    const submissionId = validateSubmissionId(req.params.submissionId)

    const rawFileIndex = req.query.fileIndex ?? '0'
    const fileIndex = Number(rawFileIndex)

    if (
      !Number.isSafeInteger(fileIndex) ||
      fileIndex < 0 ||
      String(fileIndex) !== String(rawFileIndex)
    ) {
      throw new ApiError(400, 'A valid file index is required.', 'VALIDATION_ERROR')
    }

    const result = await submissionService.createSubmissionDownloadUrl(
      req.user,
      submissionId,
      fileIndex,
    )

    return res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

module.exports = router
