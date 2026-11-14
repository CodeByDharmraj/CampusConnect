const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const authController = require('../controllers/authController')
const { ROLES } = require('../constants/roles')

const createRateLimit = require('../middleware/rateLimit')
const requireTrustedOrigin = require('../middleware/requireTrustedOrigin')

const router = express.Router()

const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again in 15 minutes.',
  code: 'LOGIN_RATE_LIMITED',
})
const refreshRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many session refresh attempts. Try again later.',
  code: 'REFRESH_RATE_LIMITED',
})
const provisioningRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Too many account provisioning requests. Try again later.',
  code: 'PROVISIONING_RATE_LIMITED',
})

router.post(
  '/register',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  provisioningRateLimit,
  authController.provisionUser,
)

router.get(
  '/faculty',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  authController.getFacultyAccounts,
)

router.get(
  '/users',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  authController.getUserAccounts,
)

router.post(
  '/login',
  loginRateLimit,
  requireTrustedOrigin,
  authController.login,
)

router.post(
  '/refresh',
  refreshRateLimit,
  requireTrustedOrigin,
  authController.refresh,
)

router.post('/logout', requireTrustedOrigin, authController.logout)

router.get('/me', authenticate, authController.getCurrentUser)

module.exports = router
