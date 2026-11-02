const mongoose = require('mongoose')
const crypto = require('node:crypto')
const RefreshSession = require('../models/RefreshSession')
const { createRefreshToken, hashRefreshToken } = require('../utils/authTokens')

const REFRESH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function createRefreshSession(userId) {
  const token = createRefreshToken()
  const tokenHash = hashRefreshToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_SESSION_TTL_MS)
  const familyId = crypto.randomUUID()

  await RefreshSession.create({
    userId,
    familyId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
}

async function rotateRefreshSession(token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
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

      // Look up the token even when revoked: a revoked token presented again
      // is a replay signal, not merely an invalid-token case.
      const currentSession = await RefreshSession.findOne({ tokenHash })
        .select('+tokenHash +replacedByTokenHash')
        .session(dbSession)

      if (!currentSession) {
        result = null
        return
      }

      if (currentSession.revokedAt) {
        // Reuse of a rotated token can indicate theft. Revoke every active
        // descendant in this login family. Legacy rows without familyId fall
        // back to revoking the user's active sessions.
        const familyFilter = currentSession.familyId
          ? { familyId: currentSession.familyId, revokedAt: null }
          : { userId: currentSession.userId, revokedAt: null }

        await RefreshSession.updateMany(
          familyFilter,
          { $set: { revokedAt: now } },
          { session: dbSession },
        )
        result = null
        return
      }

      if (currentSession.expiresAt <= now) {
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
            familyId: currentSession.familyId || crypto.randomUUID(),
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
  if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
    return false
  }

  const tokenHash = hashRefreshToken(token)
  const result = await RefreshSession.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )

  return result.modifiedCount === 1
}

async function revokeAllUserRefreshSessions(userId) {
  const result = await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )
  return result.modifiedCount
}

module.exports = {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
  revokeAllUserRefreshSessions,
}
