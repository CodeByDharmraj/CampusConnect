const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const offeringService = require('../src/services/courseOfferingService')
const reactivationService = require('../src/services/courseOfferingReactivationService')
const authService = require('../src/services/authService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const OFFERING_ID = '507f1f77bcf86cd799439013'
const REQUEST_ID = '507f1f77bcf86cd799439014'
const REASON = 'The offering is needed again for the next term.'

async function withServer(t) {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  )

  return `http://127.0.0.1:${server.address().port}`
}

function mockUser(t, role) {
  t.mock.method(User, 'findById', async () => ({
    _id: USER_ID,
    id: USER_ID,
    role,
    isActive: true,
    departmentId: role === 'coordinator' ? OFFERING_ID : null,
  }))

  return createAccessToken({ id: USER_ID, role })
}

function call(baseUrl, path, token, method = 'GET', body) {
  return fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

test('GET /course-offerings is restricted to administrators and coordinators', async (t) => {
  const token = mockUser(t, 'student')
  t.mock.method(offeringService, 'getCourseOfferings', async () => [])
  const baseUrl = await withServer(t)

  const response = await call(baseUrl, '/course-offerings', token)

  assert.equal(response.status, 403)
})

test('coordinator can list course offerings', async (t) => {
  const token = mockUser(t, 'coordinator')
  t.mock.method(offeringService, 'getCourseOfferings', async () => [{ _id: OFFERING_ID }])
  const baseUrl = await withServer(t)

  const response = await call(baseUrl, '/course-offerings', token)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.data.offerings.length, 1)
})

test('administrator can deactivate an offering and ids are validated', async (t) => {
  const token = mockUser(t, 'admin')
  let received
  t.mock.method(offeringService, 'deactivateCourseOffering', async (_user, id) => {
    received = id
    return { _id: id, isActive: false }
  })
  const baseUrl = await withServer(t)

  const bad = await call(baseUrl, '/course-offerings/not-an-id/deactivate', token, 'PATCH')
  assert.equal(bad.status, 400)

  const good = await call(baseUrl, `/course-offerings/${OFFERING_ID}/deactivate`, token, 'PATCH')
  assert.equal(good.status, 200)
  assert.equal(received, OFFERING_ID)
  assert.equal((await good.json()).data.offering.isActive, false)
})

test('only coordinators can request reactivation, with a valid reason', async (t) => {
  const baseUrl = await withServer(t)
  let called = 0
  t.mock.method(reactivationService, 'createReactivationRequest', async (_user, id, reason) => {
    called += 1
    return { _id: REQUEST_ID, courseOfferingId: id, requestReason: reason }
  })

  const adminToken = mockUser(t, 'admin')
  const forbidden = await call(baseUrl, `/course-offerings/${OFFERING_ID}/reactivation-requests`, adminToken, 'POST', { reason: REASON })
  assert.equal(forbidden.status, 403)
  assert.equal(called, 0)

  t.mock.restoreAll()
  t.mock.method(reactivationService, 'createReactivationRequest', async (_user, id, reason) => {
    called += 1
    return { _id: REQUEST_ID, courseOfferingId: id, requestReason: reason }
  })
  const coordinatorToken = mockUser(t, 'coordinator')

  const tooShort = await call(baseUrl, `/course-offerings/${OFFERING_ID}/reactivation-requests`, coordinatorToken, 'POST', { reason: 'short' })
  assert.equal(tooShort.status, 400)

  const extra = await call(baseUrl, `/course-offerings/${OFFERING_ID}/reactivation-requests`, coordinatorToken, 'POST', { reason: REASON, status: 'approved' })
  assert.equal(extra.status, 400)

  const created = await call(baseUrl, `/course-offerings/${OFFERING_ID}/reactivation-requests`, coordinatorToken, 'POST', { reason: REASON })
  assert.equal(created.status, 201)
  assert.equal(called, 1)
})

test('reactivation requests are listed for staff and decided only by administrators', async (t) => {
  t.mock.method(reactivationService, 'listReactivationRequests', async () => [{ _id: REQUEST_ID }])
  const decisions = []
  t.mock.method(reactivationService, 'approveReactivationRequest', async (_user, id, reason) => {
    decisions.push(['approve', id, reason])
    return { _id: id, status: 'approved' }
  })
  t.mock.method(reactivationService, 'rejectReactivationRequest', async (_user, id, reason) => {
    decisions.push(['reject', id, reason])
    return { _id: id, status: 'rejected' }
  })
  const baseUrl = await withServer(t)

  t.mock.method(User, 'findById', async () => ({ _id: USER_ID, id: USER_ID, role: 'coordinator', isActive: true, departmentId: OFFERING_ID }))
  const coordinatorToken = createAccessToken({ id: USER_ID, role: 'coordinator' })

  const list = await call(baseUrl, '/course-offerings/reactivation-requests', coordinatorToken)
  assert.equal(list.status, 200)
  assert.equal((await list.json()).data.requests.length, 1)

  const denied = await call(baseUrl, `/course-offerings/reactivation-requests/${REQUEST_ID}/approve`, coordinatorToken, 'PATCH', { reason: REASON })
  assert.equal(denied.status, 403)

  t.mock.method(User, 'findById', async () => ({ _id: USER_ID, id: USER_ID, role: 'admin', isActive: true, departmentId: null }))
  const adminToken = createAccessToken({ id: USER_ID, role: 'admin' })

  const approved = await call(baseUrl, `/course-offerings/reactivation-requests/${REQUEST_ID}/approve`, adminToken, 'PATCH', { reason: REASON })
  assert.equal(approved.status, 200)
  const rejected = await call(baseUrl, `/course-offerings/reactivation-requests/${REQUEST_ID}/reject`, adminToken, 'PATCH', { reason: REASON })
  assert.equal(rejected.status, 200)
  assert.deepEqual(decisions.map((d) => d[0]), ['approve', 'reject'])
})

test('GET /auth/users is administrator-only and validates the role filter', async (t) => {
  let filter
  t.mock.method(authService, 'getUserAccounts', async (value) => {
    filter = value
    return [{ _id: USER_ID, role: 'student' }]
  })
  const baseUrl = await withServer(t)

  const studentToken = mockUser(t, 'student')
  assert.equal((await call(baseUrl, '/auth/users', studentToken)).status, 403)

  t.mock.method(User, 'findById', async () => ({ _id: USER_ID, id: USER_ID, role: 'admin', isActive: true, departmentId: null }))
  const adminToken = createAccessToken({ id: USER_ID, role: 'admin' })

  assert.equal((await call(baseUrl, '/auth/users?role=bogus', adminToken)).status, 400)

  const ok = await call(baseUrl, '/auth/users?role=student', adminToken)
  assert.equal(ok.status, 200)
  assert.deepEqual(filter, { role: 'student' })
})
