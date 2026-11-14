const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const clubController = require('../controllers/clubController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

router.get('/', clubController.getClubs)

router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  clubController.createClub,
)

router.get('/:slug', clubController.getClubBySlug)

router.patch(
  '/:clubId',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  clubController.updateClub,
)

router.patch(
  '/:clubId/deactivate',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  clubController.deactivateClub,
)

module.exports = router
