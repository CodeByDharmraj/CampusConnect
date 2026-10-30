const test = require('node:test')
const assert = require('node:assert/strict')

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProvisionUser,
} = require('../src/validation/authValidation')

function assertValidationError(callback) {
  assert.throws(callback, (error) => {
    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    return true
  })
}

test('registration normalizes the name and email', () => {
  assert.deepEqual(
    validateRegister({
      name: '  Test Student  ',
      email: ' STUDENT@EXAMPLE.COM ',
      password: 'ExamplePassword123!',
    }),
    {
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
    },
  )
})

test('registration rejects missing and invalid fields', () => {
  assertValidationError(() =>
    validateRegister({
      email: 'student@example.com',
      password: 'ExamplePassword123!',
    }),
  )

  assertValidationError(() =>
    validateRegister({
      name: 'A',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
    }),
  )

  assertValidationError(() =>
    validateRegister({
      name: 'Test Student',
      email: 'invalid-email',
      password: 'ExamplePassword123!',
    }),
  )
})

test('public registration rejects a supplied role', () => {
  assertValidationError(() =>
    validateRegister({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'admin',
    }),
  )
})

test('login accepts valid credentials and normalizes email', () => {
  assert.deepEqual(
    validateLogin({
      email: 'STUDENT@example.com',
      password: 'ExamplePassword123!',
    }),
    {
      email: 'student@example.com',
      password: 'ExamplePassword123!',
    },
  )
})

test('login rejects missing credentials and unexpected fields', () => {
  assertValidationError(() =>
    validateLogin({
      email: 'student@example.com',
    }),
  )

  assertValidationError(() =>
    validateLogin({
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      isActive: false,
    }),
  )
})

test('forgot-password validation accepts only a valid email', () => {
  assert.deepEqual(
    validateForgotPassword({
      email: 'STUDENT@example.com',
    }),
    {
      email: 'student@example.com',
    },
  )

  assertValidationError(() =>
    validateForgotPassword({
      email: 'invalid-email',
    }),
  )
})

test('reset-password validation checks token and new password', () => {
  assert.deepEqual(
    validateResetPassword({
      resetToken: 'a'.repeat(32),
      newPassword: 'NewExamplePassword123!',
    }),
    {
      resetToken: 'a'.repeat(32),
      newPassword: 'NewExamplePassword123!',
    },
  )

  assertValidationError(() =>
    validateResetPassword({
      resetToken: 'short',
      newPassword: 'NewExamplePassword123!',
    }),
  )
})

test('password validation enforces length and bcrypt byte limit', () => {
  assertValidationError(() =>
    validateLogin({
      email: 'student@example.com',
      password: 'short',
    }),
  )

  assertValidationError(() =>
    validateLogin({
      email: 'student@example.com',
      password: 'é'.repeat(37),
    }),
  )
})

test('all validators reject non-object request bodies', () => {
  for (const validator of [
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
    validateProvisionUser,
  ]) {
    assertValidationError(() => validator(null))
    assertValidationError(() => validator([]))
    assertValidationError(() => validator('not an object'))
  }
})

test('admin provisioning accepts a valid role and normalizes fields', () => {
  assert.deepEqual(
    validateProvisionUser({
      name: '  Test Faculty  ',
      email: ' FACULTY@EXAMPLE.COM ',
      password: 'ExamplePassword123!',
      role: 'faculty',
    }),
    {
      name: 'Test Faculty',
      email: 'faculty@example.com',
      password: 'ExamplePassword123!',
      role: 'faculty',
    },
  )
})

test('admin provisioning rejects invalid roles and unexpected fields', () => {
  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'superadmin',
    }),
  )

  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'student',
      isActive: false,
    }),
  )
})

const TEST_DEPARTMENT_ID = '507f1f77bcf86cd799439011'

test('student provisioning requires a valid department ID', () => {
  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'student',
    }),
  )

  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'student',
      departmentId: 'invalid-id',
    }),
  )

  assert.deepEqual(
    validateProvisionUser({
      name: 'Test Student',
      email: 'STUDENT@example.com',
      password: 'ExamplePassword123!',
      role: 'student',
      departmentId: TEST_DEPARTMENT_ID,
    }),
    {
      name: 'Test Student',
      email: 'student@example.com',
      password: 'ExamplePassword123!',
      role: 'student',
      departmentId: TEST_DEPARTMENT_ID,
    },
  )
})

test('coordinator provisioning requires a valid department ID', () => {
  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Coordinator',
      email: 'coordinator@example.com',
      password: 'ExamplePassword123!',
      role: 'coordinator',
    }),
  )

  assert.deepEqual(
    validateProvisionUser({
      name: 'Test Coordinator',
      email: 'coordinator@example.com',
      password: 'ExamplePassword123!',
      role: 'coordinator',
      departmentId: TEST_DEPARTMENT_ID,
    }),
    {
      name: 'Test Coordinator',
      email: 'coordinator@example.com',
      password: 'ExamplePassword123!',
      role: 'coordinator',
      departmentId: TEST_DEPARTMENT_ID,
    },
  )
})

test('faculty provisioning does not accept a primary department', () => {
  assert.deepEqual(
    validateProvisionUser({
      name: 'Test Faculty',
      email: 'faculty@example.com',
      password: 'ExamplePassword123!',
      role: 'faculty',
    }),
    {
      name: 'Test Faculty',
      email: 'faculty@example.com',
      password: 'ExamplePassword123!',
      role: 'faculty',
    },
  )

  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Faculty',
      email: 'faculty@example.com',
      password: 'ExamplePassword123!',
      role: 'faculty',
      departmentId: TEST_DEPARTMENT_ID,
    }),
  )
})

test('administrator provisioning does not accept a primary department', () => {
  assert.deepEqual(
    validateProvisionUser({
      name: 'Test Administrator',
      email: 'admin@example.com',
      password: 'ExamplePassword123!',
      role: 'admin',
    }),
    {
      name: 'Test Administrator',
      email: 'admin@example.com',
      password: 'ExamplePassword123!',
      role: 'admin',
    },
  )

  assertValidationError(() =>
    validateProvisionUser({
      name: 'Test Administrator',
      email: 'admin@example.com',
      password: 'ExamplePassword123!',
      role: 'admin',
      departmentId: TEST_DEPARTMENT_ID,
    }),
  )
})

test('department ID must be a 24-character hexadecimal string', () => {
  const invalidDepartmentIds = [
    '',
    '507f1f77bcf86cd79943901',
    '507f1f77bcf86cd7994390111',
    '507f1f77bcf86cd79943901g',
    507,
    null,
  ]

  for (const departmentId of invalidDepartmentIds) {
    assertValidationError(() =>
      validateProvisionUser({
        name: 'Test Student',
        email: 'student@example.com',
        password: 'ExamplePassword123!',
        role: 'student',
        departmentId,
      }),
    )
  }
})
