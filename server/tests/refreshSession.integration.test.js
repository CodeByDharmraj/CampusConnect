const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { randomUUID } = require('node:crypto')

const env = require('../src/config/env')
const User = require('../src/models/User')
const RefreshSession = require('../src/models/RefreshSession')

const {
  createRefreshSession,
  rotateRefreshSession,
  revokeRefreshSession,
} = require('../src/services/refreshSessionService')

const { hashRefreshToken } = require('../src/utils/authTokens')
const authService = require('../src/services/authService')

const enabled = process.env.RUN_REFRESH_INTEGRATION_TESTS === 'true'

test('refresh-session integration tests', { skip: !enabled }, async (t) => {
  // Require explicit test mode before connecting to MongoDB.
  assert.equal(env.NODE_ENV, 'test', 'Integration tests require NODE_ENV=test.')

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  // Never run integration writes against a different database.
  if (mongoose.connection.name !== 'test') {
    await mongoose.disconnect()

    throw new Error('Integration tests may only run against the test database.')
  }

  const createdUserIds = []
  const createdTokenHashes = []

  // Register cleanup before disconnect. Cleanup must run while
  // the MongoDB connection is still open.
  t.after(async () => {
    if (createdUserIds.length > 0) {
      // Remove every refresh session belonging to our test users,
      // including replacement sessions created during authService.refresh().
      await RefreshSession.deleteMany({
        userId: { $in: createdUserIds },
      })

      await User.deleteMany({
        _id: { $in: createdUserIds },
      })
    }

    // Also clean tracked tokens if a session was created without
    // a corresponding tracked user session.
    if (createdTokenHashes.length > 0) {
      await RefreshSession.deleteMany({
        tokenHash: { $in: createdTokenHashes },
      })
    }
  })

  // Registered after cleanup so the database remains connected
  // while cleanup runs.
  t.after(async () => {
    await mongoose.disconnect()
  })

  async function createTestUser({ isActive = true } = {}) {
    const user = new User({
      name: 'Refresh Test User',
      email: `refresh-test-${randomUUID()}@example.test`,
      role: 'student',
      isActive,
    })

    await user.setPassword('IntegrationTestPassword123!')
    await user.save()

    createdUserIds.push(user._id)

    return user
  }

  async function createTrackedSession(userId) {
    const session = await createRefreshSession(userId)

    createdTokenHashes.push(hashRefreshToken(session.token))

    return session
  }

  await t.test('valid refresh token rotates once', async () => {
    const user = await createTestUser()
    const original = await createTrackedSession(user._id)

    const rotated = await rotateRefreshSession(original.token)

    assert.ok(rotated)
    assert.notEqual(rotated.token, original.token)
    assert.equal(rotated.userId.toString(), user._id.toString())

    createdTokenHashes.push(hashRefreshToken(rotated.token))

    // The old token must not be reusable.
    const reused = await rotateRefreshSession(original.token)

    assert.equal(reused, null)
  })

  await t.test('unknown token is rejected', async () => {
    const result = await rotateRefreshSession(`unknown-${randomUUID()}`)

    assert.equal(result, null)
  })

  await t.test('expired token is rejected', async () => {
    const user = await createTestUser()
    const token = `expired-${randomUUID()}`
    const tokenHash = hashRefreshToken(token)

    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
    })

    createdTokenHashes.push(tokenHash)

    const result = await rotateRefreshSession(token)

    assert.equal(result, null)
  })

  await t.test('revoked token is rejected', async () => {
    const user = await createTestUser()
    const session = await createTrackedSession(user._id)

    const revoked = await revokeRefreshSession(session.token)

    assert.equal(revoked, true)

    const result = await rotateRefreshSession(session.token)

    assert.equal(result, null)
  })

  await t.test(
    'inactive user cannot continue a refreshed session',
    async () => {
      const user = await createTestUser()
      const original = await createTrackedSession(user._id)

      await User.updateOne({ _id: user._id }, { $set: { isActive: false } })

      await assert.rejects(
        authService.refresh(original.token),
        (error) =>
          error.statusCode === 401 && error.code === 'INVALID_REFRESH_TOKEN',
      )

      // The replacement session should have been revoked.
      const activeSession = await RefreshSession.findOne({
        userId: user._id,
        revokedAt: null,
      })

      assert.equal(activeSession, null)
    },
  )

  await t.test(
    'concurrent rotation does not create two active replacements',
    async () => {
      const user = await createTestUser()
      const original = await createTrackedSession(user._id)

      const results = await Promise.all([
        rotateRefreshSession(original.token),
        rotateRefreshSession(original.token),
      ])

      const successfulRotations = results.filter(Boolean)

      for (const result of successfulRotations) {
        createdTokenHashes.push(hashRefreshToken(result.token))
      }

      // Exactly one request should rotate the same token successfully.
      assert.equal(successfulRotations.length, 1)

      const activeSessions = await RefreshSession.countDocuments({
        userId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })

      assert.equal(activeSessions, 1)
    },
  )
})
