const mongoose = require('mongoose')
const RefreshSession = require('../models/RefreshSession')
const { createRefreshToken, hashRefreshToken } = require('../utils/authTokens')

const REFRESH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function createRefreshSession(userId) {
  const token = createRefreshToken()
  const tokenHash = hashRefreshToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_MS)

  await RefreshSession.create({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
}

async function rotateRefreshSession(token) {
  if (typeof token !== 'string' || token.length === 0) {
    return null
  }

  const tokenHash = hashRefreshToken(token)
  const replacement = createRefreshToken()
  const replacementHash = hashRefreshToken(replacement)
  const replacementExpiry = new Date(Date.now() + REFRESH_SESSION_TTL_MS)

  const dbSession = await mongoose.startSession()
  let result = null

  try {
    await dbSession.withTransaction(async () => {
      const now = new Date()

      const currentSession = await RefreshSession.findOne({
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      })
        .select('+tokenHash')
        .session(dbSession)

      if (!currentSession) {
        result = null
        return
      }

      const claimedSession = await RefreshSession.findOneAndUpdate(
        {
          _id: currentSession._id,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            revokedAt: now,
            replacedByTokenHash: replacementHash,
          },
        },
        {
          returnDocument: 'before',
          session: dbSession,
        },
      )

      if (!claimedSession) {
        result = null
        return
      }

      await RefreshSession.create(
        [
          {
            userId: currentSession.userId,
            tokenHash: replacementHash,
            expiresAt: replacementExpiry,
          },
        ],
        { session: dbSession },
      )

      result = {
        token: replacement,
        expiresAt: replacementExpiry,
        userId: currentSession.userId,
      }
    })

    return result
  } finally {
    await dbSession.endSession()
  }
}

async function revokeRefreshSession(token) {
  if (typeof token !== 'string' || token.length === 0) {
    return false
  }

  const tokenHash = hashRefreshToken(token)

  const result = await RefreshSession.updateOne(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  )

  return result.modifiedCount === 1
}

module.exports = {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
}
