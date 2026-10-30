const test = require('node:test')
const assert = require('node:assert/strict')
const User = require('../src/models/User')

function createValidUser(overrides = {}) {
  return new User({
    name: 'Test Student',
    email: 'STUDENT@example.com',
    passwordHash: 'test-hash',
    role: 'student',
    ...overrides,
  })
}

test('normalizes email and applies safe account defaults', () => {
  const user = createValidUser()

  assert.equal(user.email, 'student@example.com')
  assert.equal(user.role, 'student')
  assert.equal(user.isActive, true)
  assert.ok(user.createdAt === undefined)
})

test('rejects an unsupported user role', async () => {
  const user = createValidUser({ role: 'superuser' })

  await assert.rejects(user.validate(), (error) => {
    assert.ok(error.errors.role)
    return true
  })
})

test('requires a valid email address', async () => {
  const user = createValidUser({ email: 'not-an-email' })

  await assert.rejects(user.validate(), (error) => {
    assert.ok(error.errors.email)
    return true
  })
})

test('hashes passwords and verifies the correct password', async () => {
  const user = createValidUser()

  await user.setPassword('ExamplePassword123!')

  assert.notEqual(user.passwordHash, 'ExamplePassword123!')
  assert.equal(await user.verifyPassword('ExamplePassword123!'), true)
  assert.equal(await user.verifyPassword('WrongPassword123!'), false)
})

test('rejects passwords shorter than eight characters', async () => {
  const user = createValidUser()

  await assert.rejects(user.setPassword('short'), /at least 8 characters/)
})

test('does not expose password hashes in JSON or object output', async () => {
  const user = createValidUser()

  await user.setPassword('ExamplePassword123!')

  const json = user.toJSON()
  const object = user.toObject()

  assert.ok(json.id)
  assert.equal(json._id, undefined)
  assert.equal(json.passwordHash, undefined)
  assert.equal(object.passwordHash, undefined)
  assert.equal(JSON.stringify(json).includes(user.passwordHash), false)
})

test('defines unique email and role/status indexes', () => {
  const indexes = User.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) => fields.email === 1 && options.unique === true,
    ),
  )

  assert.ok(
    indexes.some(([fields]) => fields.role === 1 && fields.isActive === 1),
  )
})
