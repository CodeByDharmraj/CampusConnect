const express = require('express')
const authService = require('../services/authService')
const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')
const createRateLimit = require('../middleware/rateLimit')
const {
  validateProvisionUser,
  validateLogin,
} = require('../validation/authValidation')
const {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/authCookies')
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
  authorizeRoles('admin'),
  provisioningRateLimit,
  asyncHandler(async (req, res) => {
    const input = validateProvisionUser(req.body)
    const user = await authService.provisionUser(input)
    return res.status(201).json({ success: true, data: { user } })
  }),
)

router.get(
  '/faculty',
  authenticate,
  authorizeRoles('admin'),
  asyncHandler(async (_req, res) => {
    const faculty = await authService.getFacultyAccounts()
    return res.status(200).json({ success: true, data: { faculty } })
  }),
)

router.post(
  '/login',
  loginRateLimit,
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const credentials = validateLogin(req.body)
    const result = await authService.login(credentials)
    setRefreshCookie(res, result.refreshToken)
    return res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    })
  }),
)

router.post(
  '/refresh',
  refreshRateLimit,
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    const result = await authService.refresh(refreshToken)
    setRefreshCookie(res, result.refreshToken)
    return res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    })
  }),
)

router.post(
  '/logout',
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    await authService.logout(refreshToken)
    clearRefreshCookie(res)
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    })
  }),
)

router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    data: { user: req.user },
  })
})

module.exports = router
