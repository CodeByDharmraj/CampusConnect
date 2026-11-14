const asyncHandler = require('../utils/asyncHandler')
const departmentService = require('../services/departmentService')
const {
  validateCreateDepartment,
} = require('../validation/departmentValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getDepartments = asyncHandler(async (req, res) => {
  const departments = await departmentService.getDepartments(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { departments },
  })
})

const createDepartment = asyncHandler(async (req, res) => {
  const input = validateCreateDepartment(req.body)
  const department = await departmentService.createDepartment(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { department },
  })
})

module.exports = {
  getDepartments,
  createDepartment,
}
