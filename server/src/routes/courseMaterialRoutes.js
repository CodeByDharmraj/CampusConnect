const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const courseMaterialController = require('../controllers/courseMaterialController')
const { ROLES } = require('../constants/roles')

const router = express.Router()
router.use(authenticate)

router.post(
  '/upload-url',
  authorizeRoles(ROLES.FACULTY),
  courseMaterialController.createUploadUrl,
)

router.post(
  '/complete',
  authorizeRoles(ROLES.FACULTY),
  courseMaterialController.completeUpload,
)

router.get(
  '/offering/:courseOfferingId',
  authorizeRoles(ROLES.FACULTY, ROLES.STUDENT),
  courseMaterialController.getOfferingMaterials,
)

router.get(
  '/:materialId/download-url',
  authorizeRoles(ROLES.FACULTY, ROLES.STUDENT),
  courseMaterialController.createDownloadUrl,
)

router.delete(
  '/:materialId',
  authorizeRoles(ROLES.FACULTY),
  courseMaterialController.deleteMaterial,
)

module.exports = router
