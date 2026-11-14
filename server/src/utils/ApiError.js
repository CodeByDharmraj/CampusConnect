class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message)

    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new TypeError('ApiError statusCode must be between 400 and 599.')
    }

    if (typeof message !== 'string' || !message.trim()) {
      throw new TypeError('ApiError message must be a non-empty string.')
    }

    if (typeof code !== 'string' || !code.trim()) {
      throw new TypeError('ApiError code must be a non-empty string.')
    }

    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  }
}

module.exports = ApiError
