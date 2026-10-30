const express = require('express')
const authService = require('../services/authService')
const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const asyncHandler = require('../utils/asyncHandler')
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

// Only an authenticated administrator can provision an account.
router.post(
  '/register',
  authenticate,
  authorizeRoles('admin'),
  asyncHandler(async (req, res) => {
    const input = validateProvisionUser(req.body)
    const user = await authService.provisionUser(input)

    return res.status(201).json({
      success: true,
      data: { user },
    })
  }),
)

// Login returns an access token and stores the refresh token in a cookie.
router.post(
  '/login',
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const credentials = validateLogin(req.body)
    const result = await authService.login(credentials)

    setRefreshCookie(res, result.refreshToken)

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
  }),
)

// Rotate the refresh session before issuing a replacement cookie.
router.post(
  '/refresh',
  requireTrustedOrigin,
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    const result = await authService.refresh(refreshToken)

    setRefreshCookie(res, result.refreshToken)

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    })
  }),
)

// Revoke the presented refresh token and clear the browser cookie.
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

// Return the current user's safe profile, never their password hash.
router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  })
})

module.exports = router
