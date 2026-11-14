const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { randomUUID } = require('node:crypto')

const env = require('../src/config/env')
const User = require('../src/models/User')
const Department = require('../src/models/Department')
const ApiError = require('../src/utils/ApiError')
const authService = require('../src/services/authService')

const enabled =
  process.env.RUN_ACCOUNT_PROVISIONING_INTEGRATION_TESTS === 'true'

test(
  'account provisioning integration tests',
  { skip: !enabled },
  async (t) => {
    assert.equal(
      env.NODE_ENV,
      'test',
      'Integration tests require NODE_ENV=test.',
    )

    await mongoose.connect(env.MONGODB_URI, {
      dbName: 'campusconnect_test',
      serverSelectionTimeoutMS: 10000,
    })

    if (mongoose.connection.name !== 'campusconnect_test') {
      await mongoose.disconnect()

      throw new Error(
        'Integration tests may only run against campusconnect_test.',
      )
    }

    const createdUserIds = []
    const createdDepartmentIds = []

    t.after(async () => {
      if (createdUserIds.length > 0) {
        await User.deleteMany({
          _id: { $in: createdUserIds },
        })
      }

      if (createdDepartmentIds.length > 0) {
        await Department.deleteMany({
          _id: { $in: createdDepartmentIds },
        })
      }
    })

    t.after(async () => {
      await mongoose.disconnect()
    })

    // Ensure actual MongoDB indexes exist before testing uniqueness.
    await User.init()
    await Department.init()

    async function createTestDepartment({ isActive = true } = {}) {
      const department = await Department.create({
        name: `Integration Department ${randomUUID()}`,
        code: `IT-${randomUUID().replace(/-/g, '').slice(0, 8)}`,
        isActive,
      })

      createdDepartmentIds.push(department._id)

      return department
    }

    async function provisionAccount(role, overrides = {}) {
      const input = {
        name: `Integration ${role}`,
        email: `${role}-${randomUUID()}@example.test`,
        password: 'IntegrationTestPassword123!',
        role,
        ...overrides,
      }

      const user = await authService.provisionUser(input)

      createdUserIds.push(user._id)

      return user
    }

    await t.test(
      'persists a student with an existing active department',
      async () => {
        const department = await createTestDepartment()

        const user = await provisionAccount('student', {
          departmentId: department._id.toString(),
        })

        const savedUser = await User.findById(user._id)

        assert.ok(savedUser)
        assert.equal(savedUser.role, 'student')
        assert.equal(
          savedUser.departmentId.toString(),
          department._id.toString(),
        )
        assert.equal(savedUser.isActive, true)
      },
    )

    await t.test(
      'persists a coordinator with an existing active department',
      async () => {
        const department = await createTestDepartment()

        const user = await provisionAccount('coordinator', {
          departmentId: department._id.toString(),
        })

        const savedUser = await User.findById(user._id)

        assert.ok(savedUser)
        assert.equal(savedUser.role, 'coordinator')
        assert.equal(
          savedUser.departmentId.toString(),
          department._id.toString(),
        )
      },
    )

    await t.test('persists faculty without a primary department', async () => {
      const user = await provisionAccount('faculty')

      const savedUser = await User.findById(user._id)

      assert.ok(savedUser)
      assert.equal(savedUser.role, 'faculty')
      assert.equal(savedUser.departmentId, undefined)
    })

    await t.test(
      'persists an administrator without a primary department',
      async () => {
        const user = await provisionAccount('admin')

        const savedUser = await User.findById(user._id)

        assert.ok(savedUser)
        assert.equal(savedUser.role, 'admin')
        assert.equal(savedUser.departmentId, undefined)
      },
    )

    await t.test(
      'rejects a student assigned to a nonexistent department',
      async () => {
        await assert.rejects(
          authService.provisionUser({
            name: 'Invalid Department Student',
            email: `missing-${randomUUID()}@example.test`,
            password: 'IntegrationTestPassword123!',
            role: 'student',
            departmentId: new mongoose.Types.ObjectId().toString(),
          }),
          (error) => {
            assert.ok(error instanceof ApiError)
            assert.equal(error.code, 'INVALID_DEPARTMENT')
            assert.equal(error.statusCode, 400)
            return true
          },
        )
      },
    )

    await t.test(
      'rejects a coordinator assigned to an inactive department',
      async () => {
        const department = await createTestDepartment({
          isActive: false,
        })

        await assert.rejects(
          authService.provisionUser({
            name: 'Inactive Department Coordinator',
            email: `inactive-${randomUUID()}@example.test`,
            password: 'IntegrationTestPassword123!',
            role: 'coordinator',
            departmentId: department._id.toString(),
          }),
          (error) => {
            assert.equal(error.code, 'INVALID_DEPARTMENT')
            assert.equal(error.statusCode, 400)
            return true
          },
        )
      },
    )

    await t.test(
      'rejects duplicate email addresses using the MongoDB unique index',
      async () => {
        const email = `duplicate-${randomUUID()}@example.test`

        const firstUser = await provisionAccount('faculty', { email })

        assert.ok(firstUser._id)

        await assert.rejects(
          authService.provisionUser({
            name: 'Duplicate Faculty',
            email,
            password: 'IntegrationTestPassword123!',
            role: 'faculty',
          }),
          (error) => {
            assert.ok(error instanceof ApiError)
            assert.equal(error.statusCode, 409)
            assert.equal(error.code, 'EMAIL_ALREADY_EXISTS')
            return true
          },
        )

        const matchingUsers = await User.countDocuments({ email })

        assert.equal(matchingUsers, 1)
      },
    )

    await t.test(
      'enforces unique department codes using the MongoDB index',
      async () => {
        const department = await createTestDepartment()

        await assert.rejects(
          Department.create({
            name: 'Duplicate Department',
            code: department.code,
          }),
          (error) => {
            assert.equal(error.code, 11000)
            return true
          },
        )

        const matchingDepartments = await Department.countDocuments({
          code: department.code,
        })

        assert.equal(matchingDepartments, 1)
      },
    )
  },
)
