const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')
const courseMaterialService = require('../services/courseMaterialService')
const {
  validateUploadRequest,
  validateCompleteRequest,
  validateOfferingId,
  validateMaterialId,
} = require('../validation/courseMaterialValidation')

const router = express.Router()
router.use(authenticate)

router.post(
  '/upload-url',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const input = validateUploadRequest(req.body)
    const result = await courseMaterialService.createUploadUrl(req.user, input)
    return res.status(200).json({
      success: true,
      message: 'Course material upload URL created successfully.',
      data: result,
    })
  }),
)

router.post(
  '/complete',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const input = validateCompleteRequest(req.body)
    const material = await courseMaterialService.completeUpload(req.user, input)
    return res.status(201).json({
      success: true,
      message: 'Course material uploaded successfully.',
      data: { material },
    })
  }),
)

router.get(
  '/offering/:courseOfferingId',
  authorizeRoles('faculty', 'student'),
  asyncHandler(async (req, res) => {
    const offeringId = validateOfferingId(req.params.courseOfferingId)
    const result = await courseMaterialService.getOfferingMaterials(req.user, offeringId)
    return res.status(200).json({ success: true, data: result })
  }),
)

router.get(
  '/:materialId/download-url',
  authorizeRoles('faculty', 'student'),
  asyncHandler(async (req, res) => {
    const materialId = validateMaterialId(req.params.materialId)
    const result = await courseMaterialService.createDownloadUrl(req.user, materialId)
    return res.status(200).json({ success: true, data: result })
  }),
)

router.delete(
  '/:materialId',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const materialId = validateMaterialId(req.params.materialId)
    const result = await courseMaterialService.deleteMaterial(req.user, materialId)
    return res.status(200).json({
      success: true,
      message: 'Course material deleted successfully.',
      data: result,
    })
  }),
)

module.exports = router
