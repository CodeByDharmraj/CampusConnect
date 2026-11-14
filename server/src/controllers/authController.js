const asyncHandler = require('../utils/asyncHandler')
const authService = require('../services/authService')
const {
  validateProvisionUser,
  validateLogin,
  validateUserListQuery,
} = require('../validation/authValidation')
const {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/authCookies')
const { HTTP_STATUS } = require('../constants/httpStatus')

const provisionUser = asyncHandler(async (req, res) => {
  const input = validateProvisionUser(req.body)
  const user = await authService.provisionUser(input)
  return res.status(HTTP_STATUS.CREATED).json({ success: true, data: { user } })
})

const getFacultyAccounts = asyncHandler(async (_req, res) => {
  const faculty = await authService.getFacultyAccounts()
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { faculty } })
})

const getUserAccounts = asyncHandler(async (req, res) => {
  const filter = validateUserListQuery(req.query)
  const users = await authService.getUserAccounts(filter)
  return res.status(HTTP_STATUS.OK).json({ success: true, data: { users } })
})

const login = asyncHandler(async (req, res) => {
  const credentials = validateLogin(req.body)
  const result = await authService.login(credentials)
  setRefreshCookie(res, result.refreshToken)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  })
})

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
  const result = await authService.refresh(refreshToken)
  setRefreshCookie(res, result.refreshToken)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user: result.user, accessToken: result.accessToken },
  })
})

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
  await authService.logout(refreshToken)
  clearRefreshCookie(res)
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully.',
  })
})

const getCurrentUser = (req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { user: req.user },
  })
}

module.exports = {
  getUserAccounts,
  provisionUser,
  getFacultyAccounts,
  login,
  refresh,
  logout,
  getCurrentUser,
}
