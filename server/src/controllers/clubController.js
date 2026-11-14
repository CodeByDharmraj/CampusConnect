const asyncHandler = require('../utils/asyncHandler')
const clubService = require('../services/clubService')
const {
  validateCreateClub,
  validateUpdateClub,
  validateClubId,
  validateClubSlug,
  validateClubQuery,
} = require('../validation/clubValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getClubs = asyncHandler(async (req, res) => {
  const filters = validateClubQuery(req.query)
  const clubs = await clubService.getClubs(req.user, filters)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { clubs } })
})

const createClub = asyncHandler(async (req, res) => {
  const input = validateCreateClub(req.body)
  const club = await clubService.createClub(req.user, input)
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Club created successfully.',
    data: { club },
  })
})

const getClubBySlug = asyncHandler(async (req, res) => {
  const slug = validateClubSlug(req.params.slug)
  const club = await clubService.getClubBySlug(req.user, slug)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { club } })
})

const updateClub = asyncHandler(async (req, res) => {
  const clubId = validateClubId(req.params.clubId)
  const updates = validateUpdateClub(req.body)
  const club = await clubService.updateClub(req.user, clubId, updates)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Club updated successfully.',
    data: { club },
  })
})

const deactivateClub = asyncHandler(async (req, res) => {
  const clubId = validateClubId(req.params.clubId)
  const club = await clubService.deactivateClub(req.user, clubId)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Club deactivated successfully.',
    data: { club },
  })
})

module.exports = {
  getClubs,
  createClub,
  getClubBySlug,
  updateClub,
  deactivateClub,
}
