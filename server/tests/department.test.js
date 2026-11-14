const test = require('node:test')
const assert = require('node:assert/strict')
const Department = require('../src/models/Department')

function createValidDepartment(overrides = {}) {
  return new Department({
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Computer Science department',
    ...overrides,
  })
}

test('normalizes department name and code', () => {
  const department = createValidDepartment({
    name: '  Computer Science and Engineering  ',
    code: '  cse  ',
  })

  assert.equal(department.name, 'Computer Science and Engineering')
  assert.equal(department.code, 'CSE')
})

test('applies safe department defaults', () => {
  const department = createValidDepartment({
    description: undefined,
    isActive: undefined,
  })

  assert.equal(department.description, '')
  assert.equal(department.isActive, true)
})

test('requires department name and code', async () => {
  const department = new Department({
    description: 'Test department',
  })

  await assert.rejects(department.validate(), (error) => {
    assert.ok(error.errors.name)
    assert.ok(error.errors.code)
    return true
  })
})

test('rejects department names shorter than two characters', async () => {
  const department = createValidDepartment({ name: 'C' })

  await assert.rejects(department.validate(), (error) => {
    assert.ok(error.errors.name)
    return true
  })
})

test('rejects invalid department codes', async () => {
  const department = createValidDepartment({ code: 'CSE@123' })

  await assert.rejects(department.validate(), (error) => {
    assert.ok(error.errors.code)
    return true
  })
})

test('rejects department codes longer than twelve characters', async () => {
  const department = createValidDepartment({
    code: 'COMPUTERSCIENCE',
  })

  await assert.rejects(department.validate(), (error) => {
    assert.ok(error.errors.code)
    return true
  })
})

test('rejects descriptions longer than 500 characters', async () => {
  const department = createValidDepartment({
    description: 'A'.repeat(501),
  })

  await assert.rejects(department.validate(), (error) => {
    assert.ok(error.errors.description)
    return true
  })
})

test('defines unique department code and active department indexes', () => {
  const indexes = Department.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) => fields.code === 1 && options.unique === true,
    ),
  )

  assert.ok(
    indexes.some(([fields]) => fields.isActive === 1 && fields.name === 1),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(Department.schema.options.timestamps, true)
})
