const asyncHandler = require('../utils/asyncHandler')
const courseMaterialService = require('../services/courseMaterialService')
const {
  validateUploadRequest,
  validateCompleteRequest,
  validateOfferingId,
  validateMaterialId,
} = require('../validation/courseMaterialValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const createUploadUrl = asyncHandler(async (req, res) => {
  const input = validateUploadRequest(req.body)
  const result = await courseMaterialService.createUploadUrl(req.user, input)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Course material upload URL created successfully.',
    data: result,
  })
})

const completeUpload = asyncHandler(async (req, res) => {
  const input = validateCompleteRequest(req.body)
  const material = await courseMaterialService.completeUpload(req.user, input)
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Course material uploaded successfully.',
    data: { material },
  })
})

const getOfferingMaterials = asyncHandler(async (req, res) => {
  const offeringId = validateOfferingId(req.params.courseOfferingId)
  const result = await courseMaterialService.getOfferingMaterials(
    req.user,
    offeringId,
  )
  return res.status(HTTP_STATUS.OK).json({ success: true, data: result })
})

const createDownloadUrl = asyncHandler(async (req, res) => {
  const materialId = validateMaterialId(req.params.materialId)
  const result = await courseMaterialService.createDownloadUrl(
    req.user,
    materialId,
  )
  return res.status(HTTP_STATUS.OK).json({ success: true, data: result })
})

const deleteMaterial = asyncHandler(async (req, res) => {
  const materialId = validateMaterialId(req.params.materialId)
  const result = await courseMaterialService.deleteMaterial(
    req.user,
    materialId,
  )
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Course material deleted successfully.',
    data: result,
  })
})

module.exports = {
  createUploadUrl,
  completeUpload,
  getOfferingMaterials,
  createDownloadUrl,
  deleteMaterial,
}
