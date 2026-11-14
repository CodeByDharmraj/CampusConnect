const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')

const app = require('../src/app')
const User = require('../src/models/User')
const submissionService = require('../src/services/submissionService')
const attendanceService = require('../src/services/attendanceService')
const { createAccessToken } = require('../src/utils/authTokens')

const USER_ID = '507f1f77bcf86cd799439011'
const SUBMISSION_ID = '507f1f77bcf86cd799439021'

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

function signIn(t, role) {
  t.mock.method(User, 'findById', async () => ({
    _id: USER_ID,
    id: USER_ID,
    role,
    isActive: true,
  }))

  return { Authorization: `Bearer ${createAccessToken({ id: USER_ID, role })}` }
}

test('download URL defaults to the first file and returns the service result', async (t) => {
  const headers = signIn(t, 'student')
  let received

  t.mock.method(
    submissionService,
    'createSubmissionDownloadUrl',
    async (user, submissionId, fileIndex) => {
      received = { submissionId, fileIndex }
      return { url: 'https://example.test/file' }
    },
  )

  const baseUrl = await withServer(t)
  const response = await fetch(
    `${baseUrl}/api/v1/submissions/${SUBMISSION_ID}/download-url`,
    { headers },
  )

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    data: { url: 'https://example.test/file' },
  })
  assert.deepEqual(received, { submissionId: SUBMISSION_ID, fileIndex: 0 })
})

test('download URL passes a parsed numeric file index to the service', async (t) => {
  const headers = signIn(t, 'faculty')
  let receivedIndex

  t.mock.method(
    submissionService,
    'createSubmissionDownloadUrl',
    async (_user, _id, fileIndex) => {
      receivedIndex = fileIndex
      return { url: 'https://example.test/file' }
    },
  )

  const baseUrl = await withServer(t)
  const response = await fetch(
    `${baseUrl}/api/v1/submissions/${SUBMISSION_ID}/download-url?fileIndex=2`,
    { headers },
  )

  assert.equal(response.status, 200)
  assert.strictEqual(receivedIndex, 2)
})

test('download URL rejects an invalid file index before reaching the service', async (t) => {
  const headers = signIn(t, 'student')
  const mock = t.mock.method(
    submissionService,
    'createSubmissionDownloadUrl',
    async () => ({}),
  )

  const baseUrl = await withServer(t)

  for (const bad of ['-1', '1.5', '02', 'abc']) {
    const response = await fetch(
      `${baseUrl}/api/v1/submissions/${SUBMISSION_ID}/download-url?fileIndex=${bad}`,
      { headers },
    )
    const body = await response.json()

    assert.equal(response.status, 400, `fileIndex=${bad}`)
    assert.equal(body.code, 'VALIDATION_ERROR')
    assert.equal(body.message, 'A valid file index is required.')
  }

  assert.equal(mock.mock.callCount(), 0)
})

test('correction review reports an invalid request ID by its own name', async (t) => {
  const headers = signIn(t, 'faculty')
  const mock = t.mock.method(
    attendanceService,
    'reviewCorrectionRequest',
    async () => ({}),
  )

  const baseUrl = await withServer(t)
  const response = await fetch(
    `${baseUrl}/api/v1/attendance/correction-requests/not-an-id/review`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' }),
    },
  )
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.code, 'VALIDATION_ERROR')
  assert.match(body.message, /correction request ID/i)
  assert.equal(mock.mock.callCount(), 0)
})

test('unauthenticated and wrong-role requests are still blocked before controllers run', async (t) => {
  const baseUrl = await withServer(t)
  const anonymous = await fetch(`${baseUrl}/api/v1/submissions/my`)
  assert.equal(anonymous.status, 401)

  const headers = signIn(t, 'student')
  const mock = t.mock.method(
    submissionService,
    'getInstitutionSubmissions',
    async () => ({}),
  )
  const forbidden = await fetch(`${baseUrl}/api/v1/submissions/institution`, {
    headers,
  })

  assert.equal(forbidden.status, 403)
  assert.equal(mock.mock.callCount(), 0)
})
