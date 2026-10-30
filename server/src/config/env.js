const path = require('node:path')
const dotenv = require('dotenv')

// Load the server's .env file, independent of the current working directory.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
})

const NODE_ENV = process.env.NODE_ENV || 'development'
const PORT = Number(process.env.PORT || 5000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const MONGODB_URI = process.env.MONGODB_URI
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'
const COOKIE_SAME_SITE = (
  process.env.COOKIE_SAME_SITE || (COOKIE_SECURE ? 'none' : 'lax')
).toLowerCase()

const validEnvironments = ['development', 'test', 'production']

if (!validEnvironments.includes(NODE_ENV)) {
  throw new Error('NODE_ENV must be development, test, or production.')
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

if (!MONGODB_URI || !MONGODB_URI.trim()) {
  throw new Error('MONGODB_URI must be configured in server/.env.')
}

if (NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN must be configured in production.')
}

for (const [name, value] of [
  ['ACCESS_TOKEN_SECRET', ACCESS_TOKEN_SECRET],
  ['REFRESH_TOKEN_SECRET', REFRESH_TOKEN_SECRET],
]) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must be configured with at least 32 bytes.`)
  }
}

if (NODE_ENV === 'production' && !COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE must be true in production.')
}

if (!['lax', 'strict', 'none'].includes(COOKIE_SAME_SITE)) {
  throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.')
}

if (COOKIE_SAME_SITE === 'none' && !COOKIE_SECURE) {
  throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.')
}

const env = Object.freeze({
  NODE_ENV,
  PORT,
  CLIENT_ORIGIN,
  MONGODB_URI,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  COOKIE_SECURE,
  COOKIE_SAME_SITE,
})

module.exports = env
