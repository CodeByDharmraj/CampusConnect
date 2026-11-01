const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const departmentService = require('../services/departmentService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateDepartment,
} = require('../validation/departmentValidation')

const router = express.Router()

router.use(authenticate)

// List departments within the authenticated user's permitted scope.
router.get(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const departments = await departmentService.getDepartments(req.user)

    return res.status(200).json({
      success: true,
      data: { departments },
    })
  }),
)

// Only administrators can create departments.
router.post(
  '/',
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const input = validateCreateDepartment(req.body)
    const department = await departmentService.createDepartment(req.user, input)

    return res.status(201).json({
      success: true,
      data: { department },
    })
  }),
)

module.exports = router
