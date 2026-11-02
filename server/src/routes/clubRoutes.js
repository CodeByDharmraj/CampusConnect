const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')
const clubService = require('../services/clubService')

const {
  validateCreateClub,
  validateUpdateClub,
  validateClubId,
  validateClubSlug,
  validateClubQuery,
} = require('../validation/clubValidation')

const router = express.Router()

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = validateClubQuery(req.query)
    const clubs = await clubService.getClubs(req.user, filters)
    return res.status(200).json({ success: true, data: { clubs } })
  }),
)

router.post(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const input = validateCreateClub(req.body)
    const club = await clubService.createClub(req.user, input)
    return res.status(201).json({
      success: true,
      message: 'Club created successfully.',
      data: { club },
    })
  }),
)

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = validateClubSlug(req.params.slug)
    const club = await clubService.getClubBySlug(req.user, slug)
    return res.status(200).json({ success: true, data: { club } })
  }),
)

router.patch(
  '/:clubId',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const clubId = validateClubId(req.params.clubId)
    const updates = validateUpdateClub(req.body)
    const club = await clubService.updateClub(req.user, clubId, updates)
    return res.status(200).json({
      success: true,
      message: 'Club updated successfully.',
      data: { club },
    })
  }),
)

router.patch(
  '/:clubId/deactivate',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const clubId = validateClubId(req.params.clubId)
    const club = await clubService.deactivateClub(req.user, clubId)
    return res.status(200).json({
      success: true,
      message: 'Club deactivated successfully.',
      data: { club },
    })
  }),
)

module.exports = router
