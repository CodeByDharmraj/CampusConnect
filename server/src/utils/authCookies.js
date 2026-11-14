const env = require('../config/env')

const REFRESH_COOKIE_NAME = 'campusconnect_refresh'
const REFRESH_COOKIE_PATH = '/api/v1/auth'
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  }
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions())
}

function clearRefreshCookie(res) {
  const { maxAge, ...clearOptions } = getRefreshCookieOptions()
  void maxAge
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions)
}

module.exports = {
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
  clearRefreshCookie,
}
