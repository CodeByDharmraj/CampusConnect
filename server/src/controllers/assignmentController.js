const asyncHandler = require('../utils/asyncHandler')
const assignmentService = require('../services/assignmentService')
const {
  validateCreateAssignment,
  validateUpdateAssignment,
  validateAssignmentId,
} = require('../validation/assignmentValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { assignments },
  })
})

const getAssignment = asyncHandler(async (req, res) => {
  const assignmentId = validateAssignmentId(req.params.assignmentId)

  const assignment = await assignmentService.getAssignment(
    req.user,
    assignmentId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { assignment },
  })
})

const createAssignment = asyncHandler(async (req, res) => {
  const input = validateCreateAssignment(req.body)

  const assignment = await assignmentService.createAssignment(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Assignment draft created successfully.',
    data: { assignment },
  })
})

const updateAssignment = asyncHandler(async (req, res) => {
  const assignmentId = validateAssignmentId(req.params.assignmentId)
  const updates = validateUpdateAssignment(req.body)

  const assignment = await assignmentService.updateAssignment(
    req.user,
    assignmentId,
    updates,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Assignment draft updated successfully.',
    data: { assignment },
  })
})

const publishAssignment = asyncHandler(async (req, res) => {
  const assignmentId = validateAssignmentId(req.params.assignmentId)

  const assignment = await assignmentService.publishAssignment(
    req.user,
    assignmentId,
  )

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Assignment published successfully.',
    data: { assignment },
  })
})

module.exports = {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
}
