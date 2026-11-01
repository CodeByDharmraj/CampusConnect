const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const announcementService = require('../services/announcementService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateAnnouncement,
  validateAnnouncementId,
} = require('../validation/announcementValidation')

const router = express.Router()

router.use(authenticate)

router.get(
  '/options',
  authorizeRoles('faculty'),
  asyncHandler(async (req, res) => {
    const options = await announcementService.getAnnouncementOptions(req.user)

    return res.status(200).json({
      success: true,
      data: options,
    })
  }),
)

// Every authenticated role can retrieve announcements within its scope.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const announcements = await announcementService.getAnnouncements(req.user)

    return res.status(200).json({
      success: true,
      data: { announcements },
    })
  }),
)

// Admin, coordinator and faculty can publish within their permitted scope.
router.post(
  '/',
  authorizeRoles('admin', 'coordinator', 'faculty'),
  asyncHandler(async (req, res) => {
    const input = validateCreateAnnouncement(req.body)

    const announcement = await announcementService.createAnnouncement(
      req.user,
      input,
    )

    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully.',
      data: { announcement },
    })
  }),
)

// Students can mark an announcement as read.
router.patch(
  '/:announcementId/read',
  authorizeRoles('student'),
  asyncHandler(async (req, res) => {
    const announcementId = validateAnnouncementId(req.params.announcementId)

    const read = await announcementService.markAnnouncementRead(
      req.user,
      announcementId,
    )

    return res.status(200).json({
      success: true,
      message: 'Announcement marked as read.',
      data: { read },
    })
  }),
)

module.exports = router
