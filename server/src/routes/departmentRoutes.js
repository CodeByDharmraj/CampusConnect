const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const departmentController = require('../controllers/departmentController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

// List departments within the authenticated user's permitted scope.
router.get(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  departmentController.getDepartments,
)

// Only administrators can create departments.
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN),
  departmentController.createDepartment,
)

module.exports = router
