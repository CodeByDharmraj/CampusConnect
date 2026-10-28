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

const env = Object.freeze({
  NODE_ENV,
  PORT,
  CLIENT_ORIGIN,
  MONGODB_URI,
})

module.exports = env
