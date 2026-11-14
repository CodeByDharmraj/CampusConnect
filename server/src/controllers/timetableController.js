const asyncHandler = require('../utils/asyncHandler')
const timetableService = require('../services/timetableService')
const {
  validateCreateTimetableEntry,
  validateUpdateTimetableEntry,
  validateTimetableEntryId,
} = require('../validation/timetableValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getTimetableEntries = asyncHandler(async (req, res) => {
  const entries = await timetableService.getTimetableEntries(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { entries },
  })
})

const getTimetableEntry = asyncHandler(async (req, res) => {
  const entryId = validateTimetableEntryId(req.params.entryId)

  const entry = await timetableService.getTimetableEntry(req.user, entryId)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { entry },
  })
})

const createTimetableEntry = asyncHandler(async (req, res) => {
  const input = validateCreateTimetableEntry(req.body)

  const entry = await timetableService.createTimetableEntry(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Timetable entry created successfully.',
    data: { entry },
  })
})

const updateTimetableEntry = asyncHandler(async (req, res) => {
  const entryId = validateTimetableEntryId(req.params.entryId)
  const updates = validateUpdateTimetableEntry(req.body)

  const entry = await timetableService.updateTimetableEntry(
    req.user,
    entryId,
    updates,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Timetable entry updated successfully.',
    data: { entry },
  })
})

const deactivateTimetableEntry = asyncHandler(async (req, res) => {
  const entryId = validateTimetableEntryId(req.params.entryId)

  const entry = await timetableService.deactivateTimetableEntry(
    req.user,
    entryId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Timetable entry deactivated successfully.',
    data: { entry },
  })
})

module.exports = {
  getTimetableEntries,
  getTimetableEntry,
  createTimetableEntry,
  updateTimetableEntry,
  deactivateTimetableEntry,
}
