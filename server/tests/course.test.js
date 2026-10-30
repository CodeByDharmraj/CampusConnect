const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Course = require('../src/models/Course')

function createValidCourse(overrides = {}) {
  return new Course({
    name: 'Database Management Systems',
    code: 'CS301',
    departmentId: new mongoose.Types.ObjectId(),
    credits: 4,
    description: 'Introduction to database systems',
    ...overrides,
  })
}

test('normalizes course name and code', () => {
  const course = createValidCourse({
    name: '  Database Management Systems  ',
    code: '  cs301  ',
  })

  assert.equal(course.name, 'Database Management Systems')
  assert.equal(course.code, 'CS301')
})

test('applies safe course defaults', () => {
  const course = createValidCourse({
    description: undefined,
    isActive: undefined,
  })

  assert.equal(course.description, '')
  assert.equal(course.isActive, true)
})

test('requires course name, code, department and credits', async () => {
  const course = new Course()

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.name)
    assert.ok(error.errors.code)
    assert.ok(error.errors.departmentId)
    assert.ok(error.errors.credits)
    return true
  })
})

test('rejects course names shorter than two characters', async () => {
  const course = createValidCourse({ name: 'C' })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.name)
    return true
  })
})

test('rejects invalid course codes', async () => {
  const course = createValidCourse({ code: 'CS@301' })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.code)
    return true
  })
})

test('rejects course codes longer than twenty characters', async () => {
  const course = createValidCourse({
    code: 'COMPUTERSCIENCECOURSE',
  })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.code)
    return true
  })
})

test('rejects credits below one or above ten', async () => {
  for (const credits of [0, 11]) {
    const course = createValidCourse({ credits })

    await assert.rejects(course.validate(), (error) => {
      assert.ok(error.errors.credits)
      return true
    })
  }
})

test('rejects fractional course credits', async () => {
  const course = createValidCourse({ credits: 3.5 })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.credits)
    return true
  })
})

test('rejects an invalid department ObjectId', async () => {
  const course = createValidCourse({
    departmentId: 'not-a-valid-object-id',
  })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.departmentId)
    return true
  })
})

test('rejects descriptions longer than 500 characters', async () => {
  const course = createValidCourse({
    description: 'A'.repeat(501),
  })

  await assert.rejects(course.validate(), (error) => {
    assert.ok(error.errors.description)
    return true
  })
})

test('references the Department model', () => {
  const departmentPath = Course.schema.path('departmentId')

  assert.equal(departmentPath.instance, 'ObjectId')
  assert.equal(departmentPath.options.ref, 'Department')
})

test('defines department-scoped unique course code index', () => {
  const indexes = Course.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.departmentId === 1 &&
        fields.code === 1 &&
        options.unique === true,
    ),
  )
})

test('defines department and active status index', () => {
  const indexes = Course.schema.indexes()

  assert.ok(
    indexes.some(
      ([fields]) =>
        fields.departmentId === 1 && fields.isActive === 1 && fields.name === 1,
    ),
  )
})

test('enables automatic timestamps', () => {
  assert.equal(Course.schema.options.timestamps, true)
})
