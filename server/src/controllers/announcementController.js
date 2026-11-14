const asyncHandler = require('../utils/asyncHandler')
const announcementService = require('../services/announcementService')
const {
  validateCreateAnnouncement,
  validateAnnouncementId,
} = require('../validation/announcementValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getAnnouncementOptions = asyncHandler(async (req, res) => {
  const options = await announcementService.getAnnouncementOptions(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: options,
  })
})

const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await announcementService.getAnnouncements(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { announcements },
  })
})

const createAnnouncement = asyncHandler(async (req, res) => {
  const input = validateCreateAnnouncement(req.body)

  const announcement = await announcementService.createAnnouncement(
    req.user,
    input,
  )

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Announcement published successfully.',
    data: { announcement },
  })
})

const markAnnouncementRead = asyncHandler(async (req, res) => {
  const announcementId = validateAnnouncementId(req.params.announcementId)

  const read = await announcementService.markAnnouncementRead(
    req.user,
    announcementId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Announcement marked as read.',
    data: { read },
  })
})

module.exports = {
  getAnnouncementOptions,
  getAnnouncements,
  createAnnouncement,
  markAnnouncementRead,
}
