const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const enrollmentService = require('../services/enrollmentService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateEnrollment,
  validateOfferingId,
  validateEnrollmentId,
} = require('../validation/enrollmentValidation')

const router = express.Router()

router.use(authenticate)
router.use(authorizeRoles('admin'))

// Load active students and active course offerings for the admin interface.
router.get(
  '/options',
  asyncHandler(async (req, res) => {
    const options = await enrollmentService.getEnrollmentOptions(req.user)

    return res.status(200).json({
      success: true,
      data: options,
    })
  }),
)

// List enrollment history for one course offering.
router.get(
  '/offerings/:offeringId',
  asyncHandler(async (req, res) => {
    const offeringId = validateOfferingId(req.params.offeringId)
    const result = await enrollmentService.getOfferingEnrollments(
      req.user,
      offeringId,
    )

    return res.status(200).json({
      success: true,
      data: result,
    })
  }),
)

// Add a student or reactivate their withdrawn enrollment.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = validateCreateEnrollment(req.body)
    const enrollment = await enrollmentService.createEnrollment(req.user, input)

    return res.status(201).json({
      success: true,
      data: { enrollment },
    })
  }),
)

// Withdraw an active enrollment without deleting its history.
router.delete(
  '/:enrollmentId',
  asyncHandler(async (req, res) => {
    const enrollmentId = validateEnrollmentId(req.params.enrollmentId)
    const enrollment = await enrollmentService.withdrawEnrollment(
      req.user,
      enrollmentId,
    )

    return res.status(200).json({
      success: true,
      data: { enrollment },
    })
  }),
)

module.exports = router
