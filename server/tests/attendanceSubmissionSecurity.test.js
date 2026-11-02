const test = require('node:test')
const assert = require('node:assert/strict')
const { mock } = require('node:test')

const AttendanceSession = require('../src/models/AttendanceSession')
const AttendanceRecord = require('../src/models/AttendanceRecord')
const CourseOffering = require('../src/models/CourseOffering')
const Enrollment = require('../src/models/Enrollment')
const FacultyCourse = require('../src/models/FacultyCourse')
const Submission = require('../src/models/Submission')
const Assignment = require('../src/models/Assignment')
const storageService = require('../src/services/storageService')

const {
  validateBulkAttendance,
} = require('../src/validation/attendanceValidation')
const {
  validateUploadRequest,
  validateCompleteRequest,
} = require('../src/validation/submissionValidation')
const { bulkMarkAttendance } = require('../src/services/attendanceService')
const {
  createSubmissionDownloadUrl,
} = require('../src/services/submissionService')

const FACULTY_ID = '507f1f77bcf86cd799439011'
const OTHER_FACULTY_ID = '507f1f77bcf86cd799439012'
const STUDENT_ID = '507f1f77bcf86cd799439013'
const OUTSIDER_ID = '507f1f77bcf86cd799439014'
const SESSION_ID = '507f1f77bcf86cd799439015'
const OFFERING_ID = '507f1f77bcf86cd799439016'
const ASSIGNMENT_ID = '507f1f77bcf86cd799439017'
const SUBMISSION_ID = '507f1f77bcf86cd799439018'

function restoreMocks(t) {
  t.after(() => mock.restoreAll())
}

function leanQuery(value) {
  return {
    select() {
      return this
    },
    lean: async () => value,
  }
}

test('attendance bulk validation rejects duplicate student entries', () => {
  assert.throws(
    () =>
      validateBulkAttendance({
        attendance: [
          { studentId: STUDENT_ID, status: 'present' },
          { studentId: STUDENT_ID, status: 'absent' },
        ],
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('attendance bulk validation rejects unknown fields and invalid statuses', () => {
  assert.throws(
    () =>
      validateBulkAttendance({
        attendance: [{ studentId: STUDENT_ID, status: 'present', role: 'admin' }],
      }),
    { code: 'VALIDATION_ERROR' },
  )

  assert.throws(
    () =>
      validateBulkAttendance({
        attendance: [{ studentId: STUDENT_ID, status: 'on-time' }],
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('attendance service scopes open-session lookup to the requesting faculty member', async (t) => {
  restoreMocks(t)
  let receivedFilter

  mock.method(AttendanceSession, 'findOne', (filter) => {
    receivedFilter = filter
    return leanQuery(null)
  })

  await assert.rejects(
    bulkMarkAttendance(
      { _id: FACULTY_ID, role: 'faculty' },
      SESSION_ID,
      { attendance: [{ studentId: STUDENT_ID, status: 'present' }] },
    ),
    { code: 'OPEN_ATTENDANCE_SESSION_NOT_FOUND' },
  )

  assert.equal(String(receivedFilter.facultyId), FACULTY_ID)
  assert.equal(receivedFilter.status, 'open')
})

test('attendance service rejects a student who is not in the active enrollment roster', async (t) => {
  restoreMocks(t)

  mock.method(AttendanceSession, 'findOne', () =>
    leanQuery({
      _id: SESSION_ID,
      courseOfferingId: OFFERING_ID,
      facultyId: FACULTY_ID,
      status: 'open',
    }),
  )
  mock.method(CourseOffering, 'findOne', () =>
    leanQuery({ _id: OFFERING_ID, isActive: true }),
  )
  mock.method(FacultyCourse, 'exists', async () => ({ _id: 'assignment' }))
  mock.method(Enrollment, 'find', () => ({
    select() {
      return this
    },
    lean: async () => [
      {
        _id: '507f1f77bcf86cd799439019',
        studentId: STUDENT_ID,
      },
    ],
  }))

  await assert.rejects(
    bulkMarkAttendance(
      { _id: FACULTY_ID, role: 'faculty' },
      SESSION_ID,
      { attendance: [{ studentId: OUTSIDER_ID, status: 'present' }] },
    ),
    { code: 'STUDENT_NOT_ENROLLED' },
  )
})

test('attendance model declares a unique session/student record index', () => {
  const indexes = AttendanceRecord.schema.indexes()
  const uniqueIndex = indexes.find(
    ([keys, options]) =>
      keys.sessionId === 1 && keys.studentId === 1 && options.unique === true,
  )

  assert.ok(uniqueIndex, 'Expected unique index on sessionId + studentId')
})

test('submission upload validation rejects unsupported types and oversized files', () => {
  assert.throws(
    () =>
      validateUploadRequest({
        assignmentId: ASSIGNMENT_ID,
        fileName: 'payload.exe',
        contentType: 'application/x-msdownload',
        fileSize: 1024,
      }),
    { code: 'VALIDATION_ERROR' },
  )

  assert.throws(
    () =>
      validateUploadRequest({
        assignmentId: ASSIGNMENT_ID,
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        fileSize: 10 * 1024 * 1024 + 1,
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('submission completion validation rejects path-like or oversized file metadata', () => {
  assert.throws(
    () =>
      validateCompleteRequest({
        assignmentId: ASSIGNMENT_ID,
        files: [
          {
            objectKey: `submissions/${STUDENT_ID}/${ASSIGNMENT_ID}/file-id`,
            fileName: 'report.pdf',
            contentType: 'application/pdf',
            fileSize: 10 * 1024 * 1024 + 1,
          },
        ],
      }),
    { code: 'VALIDATION_ERROR' },
  )

  assert.throws(
    () =>
      validateCompleteRequest({
        assignmentId: ASSIGNMENT_ID,
        files: [
          {
            objectKey: `submissions/${STUDENT_ID}/${ASSIGNMENT_ID}/file-id`,
            fileName: 'report.pdf',
            contentType: 'application/pdf',
            fileSize: 1024,
            isAdmin: true,
          },
        ],
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('submission completion validation enforces the combined 20 MB limit', () => {
  const file = (suffix) => ({
    objectKey: `submissions/${STUDENT_ID}/${ASSIGNMENT_ID}/${suffix}`,
    fileName: `${suffix}.pdf`,
    contentType: 'application/pdf',
    fileSize: 7 * 1024 * 1024,
  })

  assert.throws(
    () =>
      validateCompleteRequest({
        assignmentId: ASSIGNMENT_ID,
        files: [file('one'), file('two'), file('three')],
      }),
    { code: 'VALIDATION_ERROR' },
  )
})

test('a student cannot obtain a signed URL for another student submission', async (t) => {
  restoreMocks(t)
  let signerCalled = false

  mock.method(Submission, 'findById', async () => ({
    _id: SUBMISSION_ID,
    studentId: OTHER_FACULTY_ID,
    assignmentId: ASSIGNMENT_ID,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        files: [
          {
            objectKey: 'private/submission-object',
            originalName: 'report.pdf',
          },
        ],
      },
    ],
  }))
  mock.method(storageService, 'createDownloadUrl', async () => {
    signerCalled = true
    return 'https://storage.example.test/signed'
  })

  await assert.rejects(
    createSubmissionDownloadUrl(
      { _id: STUDENT_ID, role: 'student' },
      SUBMISSION_ID,
    ),
    { code: 'SUBMISSION_OWNERSHIP_REQUIRED' },
  )

  assert.equal(signerCalled, false, 'Unauthorized requests must not reach storage signing')
})

test('faculty cannot obtain a signed URL for a submission owned by another faculty member', async (t) => {
  restoreMocks(t)
  let signerCalled = false

  mock.method(Submission, 'findById', async () => ({
    _id: SUBMISSION_ID,
    studentId: STUDENT_ID,
    assignmentId: ASSIGNMENT_ID,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        files: [
          {
            objectKey: 'private/submission-object',
            originalName: 'report.pdf',
          },
        ],
      },
    ],
  }))
  mock.method(Assignment, 'findById', () => ({
    populate: async () => ({
      _id: ASSIGNMENT_ID,
      facultyId: OTHER_FACULTY_ID,
      courseOfferingId: { isActive: true },
    }),
  }))
  mock.method(storageService, 'createDownloadUrl', async () => {
    signerCalled = true
    return 'https://storage.example.test/signed'
  })

  await assert.rejects(
    createSubmissionDownloadUrl(
      { _id: FACULTY_ID, role: 'faculty' },
      SUBMISSION_ID,
    ),
    { code: 'ASSIGNMENT_OWNERSHIP_REQUIRED' },
  )

  assert.equal(signerCalled, false, 'Unauthorized faculty must not reach storage signing')
})
