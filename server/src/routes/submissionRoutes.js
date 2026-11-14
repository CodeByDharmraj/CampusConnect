const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const submissionController = require('../controllers/submissionController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

// Generate a short-lived upload URL for an enrolled student.
router.post(
  '/upload-url',
  authorizeRoles(ROLES.STUDENT),
  submissionController.createUploadUrl,
)

// Confirm an upload and save the submission in MongoDB.
router.post(
  '/complete',
  authorizeRoles(ROLES.STUDENT),
  submissionController.completeSubmission,
)

// Retrieve the authenticated student's submission history.
router.get(
  '/my',
  authorizeRoles(ROLES.STUDENT),
  submissionController.getMySubmissions,
)

// Coordinator views submissions belonging to their department.
router.get(
  '/department',
  authorizeRoles(ROLES.COORDINATOR),
  submissionController.getDepartmentSubmissions,
)

// Admin views submissions across the institution.
router.get(
  '/institution',
  authorizeRoles(ROLES.ADMIN),
  submissionController.getInstitutionSubmissions,
)

// Faculty retrieves submissions for an assignment they own.
router.get(
  '/assignment/:assignmentId',
  authorizeRoles(ROLES.FACULTY),
  submissionController.getAssignmentSubmissions,
)

// Faculty evaluates a student's latest submission.
router.patch(
  '/:submissionId/evaluate',
  authorizeRoles(ROLES.FACULTY),
  submissionController.evaluateSubmission,
)

// Generate an authorized, temporary download URL.
router.get(
  '/:submissionId/download-url',
  authorizeRoles(ROLES.STUDENT, ROLES.FACULTY),
  submissionController.createSubmissionDownloadUrl,
)

module.exports = router
