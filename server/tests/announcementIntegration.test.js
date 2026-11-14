const test = require('node:test')
const assert = require('node:assert/strict')
const { mock } = require('node:test')

const Announcement = require('../src/models/Announcement')
const AnnouncementRead = require('../src/models/AnnouncementRead')
const Enrollment = require('../src/models/Enrollment')
const announcementService = require('../src/services/announcementService')

const ADMIN_ID = '507f1f77bcf86cd799439011'
const STUDENT_ID = '507f1f77bcf86cd799439012'
const DEPARTMENT_ID = '507f1f77bcf86cd799439013'
const ANNOUNCEMENT_ID = '507f1f77bcf86cd799439014'
const OFFERING_ID = '507f1f77bcf86cd799439015'

function chainQuery(value) {
  return {
    populate() { return this },
    sort() { return this },
    select() { return this },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) },
  }
}

test('announcement schema requires department/course targets only for matching scopes', () => {
  const departmentAnnouncement = new Announcement({
    title: 'Department notice', detail: 'A sufficiently detailed announcement.',
    category: 'Academic', scope: 'department', authorId: ADMIN_ID,
  })
  const courseAnnouncement = new Announcement({
    title: 'Course notice', detail: 'A sufficiently detailed announcement.',
    category: 'Academic', scope: 'course', authorId: ADMIN_ID,
  })
  assert.ok(departmentAnnouncement.validateSync().errors.departmentId)
  assert.ok(courseAnnouncement.validateSync().errors.courseOfferingId)
})

test('announcement read model prevents duplicate read records per student', () => {
  const index = AnnouncementRead.schema.indexes().find(([keys, options]) =>
    keys.announcementId === 1 && keys.studentId === 1 && options.unique === true,
  )
  assert.ok(index)
})

test('student announcement feed is restricted to institution, own department and enrolled courses and excludes expired items', async () => {
  let receivedFilter
  mock.method(Enrollment, 'find', () => ({
    select: async () => [{ courseOfferingId: OFFERING_ID }],
  }))
  mock.method(Announcement, 'find', (filter) => {
    receivedFilter = filter
    return chainQuery([])
  })
  mock.method(AnnouncementRead, 'find', () => ({ select: async () => [] }))

  await announcementService.getAnnouncements({
    _id: STUDENT_ID, role: 'student', departmentId: DEPARTMENT_ID,
  })

  const visibility = receivedFilter.$and.find((part) => part.$or?.some((scope) => scope.scope))
  assert.ok(visibility)
  assert.ok(visibility.$or.some((scope) => scope.scope === 'institution'))
  assert.ok(visibility.$or.some((scope) => scope.scope === 'department' && String(scope.departmentId) === DEPARTMENT_ID))
  assert.ok(visibility.$or.some((scope) => scope.scope === 'course' && scope.courseOfferingId.$in.includes(OFFERING_ID)))
  assert.ok(receivedFilter.$and.some((part) => part.$or?.some((expiry) => expiry.expiresAt?.$gt instanceof Date)))
})

test('student feed attaches per-student read state without changing announcement records', async () => {
  const published = {
    _id: ANNOUNCEMENT_ID,
    toObject: () => ({ _id: ANNOUNCEMENT_ID, title: 'Exam notice' }),
  }
  mock.method(Enrollment, 'find', () => ({ select: async () => [] }))
  mock.method(Announcement, 'find', () => chainQuery([published]))
  mock.method(AnnouncementRead, 'find', () => ({
    select: async () => [{ announcementId: ANNOUNCEMENT_ID, readAt: new Date('2026-10-01T10:00:00Z') }],
  }))

  const [item] = await announcementService.getAnnouncements({ _id: STUDENT_ID, role: 'student' })
  assert.equal(item.isRead, true)
  assert.equal(item.readAt.toISOString(), '2026-10-01T10:00:00.000Z')
})

test('students cannot publish announcements', async () => {
  await assert.rejects(
    announcementService.createAnnouncement({ _id: STUDENT_ID, role: 'student' }, {
      title: 'Invalid notice', detail: 'Students must not publish this.', category: 'Academic',
    }),
    { code: 'FORBIDDEN' },
  )
})

test('admin-created announcements are institution-wide and author is server-derived', async () => {
  let payload
  mock.method(Announcement, 'create', async (document) => {
    payload = document
    return document
  })
  await announcementService.createAnnouncement({ _id: ADMIN_ID, role: 'admin' }, {
    title: 'Institution notice', detail: 'A sufficiently detailed institution announcement.',
    category: 'Campus', scope: 'course', authorId: STUDENT_ID,
  })
  assert.equal(payload.scope, 'institution')
  assert.equal(String(payload.authorId), ADMIN_ID)
  assert.equal(payload.courseOfferingId, null)
  assert.equal(payload.departmentId, null)
})

test('read tracking rejects non-student roles and invalid announcement IDs', async () => {
  await assert.rejects(
    announcementService.markAnnouncementRead({ _id: ADMIN_ID, role: 'admin' }, ANNOUNCEMENT_ID),
    { code: 'FORBIDDEN' },
  )
  await assert.rejects(
    announcementService.markAnnouncementRead({ _id: STUDENT_ID, role: 'student' }, 'not-an-id'),
    { code: 'VALIDATION_ERROR' },
  )
})
