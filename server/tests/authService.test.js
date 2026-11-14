const test = require('node:test')
const assert = require('node:assert/strict')

const User = require('../src/models/User')
const Department = require('../src/models/Department')
const ApiError = require('../src/utils/ApiError')
const authService = require('../src/services/authService')

const TEST_DEPARTMENT_ID = '507f1f77bcf86cd799439011'

function createProvisioningInput(role, overrides = {}) {
  return {
    name: 'Test Account',
    email: `${role}@example.com`,
    password: 'ExamplePassword123!',
    role,
    ...(role === 'student' || role === 'coordinator'
      ? { departmentId: TEST_DEPARTMENT_ID }
      : {}),
    ...overrides,
  }
}

function mockUserCreation(t) {
  t.mock.method(User.prototype, 'setPassword', async function (password) {
    this.passwordHash = `mock-hash-${password}`
  })

  t.mock.method(User.prototype, 'save', async function () {
    return this
  })
}

test('provisions a student with an existing active department', async (t) => {
  mockUserCreation(t)

  const findDepartment = t.mock.method(Department, 'findOne', async () => ({
    _id: TEST_DEPARTMENT_ID,
    isActive: true,
  }))

  const user = await authService.provisionUser(
    createProvisioningInput('student'),
  )

  assert.equal(user.role, 'student')
  assert.equal(user.departmentId.toString(), TEST_DEPARTMENT_ID)
  assert.equal(user.isActive, true)

  assert.deepEqual(findDepartment.mock.calls[0].arguments[0], {
    _id: TEST_DEPARTMENT_ID,
    isActive: true,
  })
})

test('provisions a coordinator with an existing active department', async (t) => {
  mockUserCreation(t)

  const findDepartment = t.mock.method(Department, 'findOne', async () => ({
    _id: TEST_DEPARTMENT_ID,
    isActive: true,
  }))

  const user = await authService.provisionUser(
    createProvisioningInput('coordinator'),
  )

  assert.equal(user.role, 'coordinator')
  assert.equal(user.departmentId.toString(), TEST_DEPARTMENT_ID)

  assert.deepEqual(findDepartment.mock.calls[0].arguments[0], {
    _id: TEST_DEPARTMENT_ID,
    isActive: true,
  })
})

test('rejects a student when the department does not exist', async (t) => {
  mockUserCreation(t)

  t.mock.method(Department, 'findOne', async () => null)

  const save = t.mock.method(User.prototype, 'save', async function () {
    return this
  })

  await assert.rejects(
    authService.provisionUser(createProvisioningInput('student')),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'INVALID_DEPARTMENT')
      return true
    },
  )

  assert.equal(save.mock.callCount(), 0)
})

test('rejects a coordinator when the department is inactive', async (t) => {
  mockUserCreation(t)

  t.mock.method(Department, 'findOne', async () => null)

  const save = t.mock.method(User.prototype, 'save', async function () {
    return this
  })

  await assert.rejects(
    authService.provisionUser(createProvisioningInput('coordinator')),
    (error) => {
      assert.equal(error.code, 'INVALID_DEPARTMENT')
      return true
    },
  )

  assert.equal(save.mock.callCount(), 0)
})

test('provisions faculty without querying for a primary department', async (t) => {
  mockUserCreation(t)

  const findDepartment = t.mock.method(Department, 'findOne')

  const user = await authService.provisionUser(
    createProvisioningInput('faculty'),
  )

  assert.equal(user.role, 'faculty')
  assert.equal(user.departmentId, undefined)
  assert.equal(findDepartment.mock.callCount(), 0)
})

test('provisions an administrator without querying for a primary department', async (t) => {
  mockUserCreation(t)

  const findDepartment = t.mock.method(Department, 'findOne')

  const user = await authService.provisionUser(createProvisioningInput('admin'))

  assert.equal(user.role, 'admin')
  assert.equal(user.departmentId, undefined)
  assert.equal(findDepartment.mock.callCount(), 0)
})

test('rejects an unsupported role before querying the database', async (t) => {
  mockUserCreation(t)

  const findDepartment = t.mock.method(Department, 'findOne')

  await assert.rejects(
    authService.provisionUser(createProvisioningInput('superadmin')),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.code, 'VALIDATION_ERROR')
      return true
    },
  )

  assert.equal(findDepartment.mock.callCount(), 0)
})
