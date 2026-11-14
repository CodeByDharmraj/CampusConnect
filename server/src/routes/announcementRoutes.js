const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const announcementController = require('../controllers/announcementController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

router.get(
  '/options',
  authorizeRoles(ROLES.FACULTY),
  announcementController.getAnnouncementOptions,
)

// Every authenticated role can retrieve announcements within its scope.
router.get('/', announcementController.getAnnouncements)

// Admin, coordinator and faculty can publish within their permitted scope.
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.FACULTY),
  announcementController.createAnnouncement,
)

// Students can mark an announcement as read.
router.patch(
  '/:announcementId/read',
  authorizeRoles(ROLES.STUDENT),
  announcementController.markAnnouncementRead,
)

module.exports = router
