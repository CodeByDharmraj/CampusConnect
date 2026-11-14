const test = require('node:test')
const assert = require('node:assert/strict')

const {
  ROLES,
  ROLE_VALUES,
  DEPARTMENT_REQUIRED_ROLES,
} = require('../src/constants/roles')
const { HTTP_STATUS } = require('../src/constants/httpStatus')
const constants = require('../src/constants')
const User = require('../src/models/User')
const authorizeRoles = require('../src/middleware/authorizeRoles')

test('role constants are frozen and list every supported role', () => {
  assert.ok(Object.isFrozen(ROLES))
  assert.ok(Object.isFrozen(ROLE_VALUES))
  assert.ok(Object.isFrozen(DEPARTMENT_REQUIRED_ROLES))
  assert.deepEqual([...ROLE_VALUES].sort(), [
    'admin',
    'coordinator',
    'faculty',
    'student',
  ])
})

test('the User model uses the shared role list', () => {
  assert.deepEqual([...User.USER_ROLES], [...ROLE_VALUES])
  assert.equal(User.schema.path('role').defaultValue, ROLES.STUDENT)
})

test('only students and coordinators require a department', () => {
  assert.deepEqual(
    [...DEPARTMENT_REQUIRED_ROLES].sort(),
    [ROLES.COORDINATOR, ROLES.STUDENT].sort(),
  )
})

test('HTTP status constants match the codes the API returns', () => {
  assert.ok(Object.isFrozen(HTTP_STATUS))
  assert.equal(HTTP_STATUS.OK, 200)
  assert.equal(HTTP_STATUS.CREATED, 201)
  assert.equal(HTTP_STATUS.UNAUTHORIZED, 401)
  assert.equal(HTTP_STATUS.FORBIDDEN, 403)
  assert.equal(HTTP_STATUS.CONFLICT, 409)
})

test('the constants index re-exports everything', () => {
  assert.equal(constants.ROLES, ROLES)
  assert.equal(constants.HTTP_STATUS, HTTP_STATUS)
})

test('authorizeRoles exposes its configured roles for tooling', () => {
  const guard = authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR)

  assert.deepEqual([...guard.allowedRoles], ['admin', 'coordinator'])
  assert.ok(Object.isFrozen(guard.allowedRoles))
  assert.throws(() => authorizeRoles('superuser'), TypeError)
})
