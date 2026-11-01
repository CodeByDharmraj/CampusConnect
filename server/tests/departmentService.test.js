const test = require('node:test')
const assert = require('node:assert/strict')

const Department = require('../src/models/Department')
const departmentService = require('../src/services/departmentService')

const ADMIN_ID = '507f1f77bcf86cd799439011'
const DEPARTMENT_ID = '507f1f77bcf86cd799439012'

const sampleDepartment = {
  _id: DEPARTMENT_ID,
  name: 'Computer Science and Engineering',
  code: 'CSE',
  description: 'Computer Science department',
  isActive: true,
}

test('administrator can list all departments', async (t) => {
  let receivedFilter

  t.mock.method(Department, 'find', (filter) => {
    receivedFilter = filter

    return {
      sort: async () => [sampleDepartment],
    }
  })

  const result = await departmentService.getDepartments({
    _id: ADMIN_ID,
    role: 'admin',
  })

  assert.deepEqual(receivedFilter, {})
  assert.deepEqual(result, [sampleDepartment])
})

test('coordinator can only list their assigned department', async (t) => {
  let receivedFilter

  t.mock.method(Department, 'find', (filter) => {
    receivedFilter = filter

    return {
      sort: async () => [sampleDepartment],
    }
  })

  const result = await departmentService.getDepartments({
    _id: ADMIN_ID,
    role: 'coordinator',
    departmentId: DEPARTMENT_ID,
  })

  assert.deepEqual(receivedFilter, {
    _id: DEPARTMENT_ID,
  })

  assert.deepEqual(result, [sampleDepartment])
})

test('rejects students and faculty from listing departments', async () => {
  for (const role of ['student', 'faculty']) {
    await assert.rejects(
      departmentService.getDepartments({
        _id: ADMIN_ID,
        role,
      }),
      { code: 'FORBIDDEN' },
    )
  }
})

test('rejects coordinators without a valid department assignment', async () => {
  await assert.rejects(
    departmentService.getDepartments({
      _id: ADMIN_ID,
      role: 'coordinator',
      departmentId: null,
    }),
    { code: 'FORBIDDEN' },
  )
})

test('rejects unauthenticated department access', async () => {
  await assert.rejects(departmentService.getDepartments(null), {
    code: 'AUTHENTICATION_REQUIRED',
  })
})

test('administrator can create a department', async (t) => {
  let savedDepartment

  t.mock.method(Department.prototype, 'save', async function () {
    savedDepartment = this
    return this
  })

  const result = await departmentService.createDepartment(
    { _id: ADMIN_ID, role: 'admin' },
    {
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Computer Science department',
    },
  )

  assert.equal(result, savedDepartment)
  assert.equal(savedDepartment.name, 'Computer Science and Engineering')
  assert.equal(savedDepartment.code, 'CSE')
  assert.equal(savedDepartment.isActive, true)
})

test('coordinator cannot create a department', async () => {
  await assert.rejects(
    departmentService.createDepartment(
      {
        _id: ADMIN_ID,
        role: 'coordinator',
        departmentId: DEPARTMENT_ID,
      },
      {
        name: 'Computer Science',
        code: 'CSE',
      },
    ),
    { code: 'FORBIDDEN' },
  )
})

test('converts duplicate department codes into a conflict', async (t) => {
  t.mock.method(Department.prototype, 'save', async () => {
    throw { code: 11000 }
  })

  await assert.rejects(
    departmentService.createDepartment(
      { _id: ADMIN_ID, role: 'admin' },
      {
        name: 'Computer Science',
        code: 'CSE',
      },
    ),
    {
      code: 'DEPARTMENT_CODE_ALREADY_EXISTS',
      statusCode: 409,
    },
  )
})
