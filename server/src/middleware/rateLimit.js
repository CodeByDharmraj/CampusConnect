const ApiError = require('../utils/ApiError')

function createRateLimit({
  windowMs,
  max,
  message = 'Too many requests. Please try again later.',
  code = 'RATE_LIMIT_EXCEEDED',
}) {
  if (!Number.isInteger(windowMs) || windowMs < 1000) {
    throw new TypeError('windowMs must be an integer of at least 1000.')
  }
  if (!Number.isInteger(max) || max < 1) {
    throw new TypeError('max must be a positive integer.')
  }

  const buckets = new Map()

  return function rateLimit(req, res, next) {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    let bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1

    // Bound memory use if many distinct source addresses hit the endpoint.
    if (buckets.size > 10000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey)
      }
      if (buckets.size > 10000) {
        const oldestKey = buckets.keys().next().value
        if (oldestKey !== undefined) buckets.delete(oldestKey)
      }
    }

    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      res.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))),
      )
      return next(new ApiError(429, message, code))
    }

    return next()
  }
}

module.exports = createRateLimit
