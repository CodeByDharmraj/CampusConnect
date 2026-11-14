const mongoose = require('mongoose')

const User = require('../models/User')
const Department = require('../models/Department')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const Assignment = require('../models/Assignment')
const Submission = require('../models/Submission')
const AttendanceRecord = require('../models/AttendanceRecord')
const AttendanceSession = require('../models/AttendanceSession')
const Announcement = require('../models/Announcement')
const AnnouncementRead = require('../models/AnnouncementRead')
const Club = require('../models/Club')
const Event = require('../models/Event')
const EventRegistration = require('../models/EventRegistration')
const ApiError = require('../utils/ApiError')

function requireAuthenticatedUser(user) {
  if (!user?._id || !['student', 'faculty', 'coordinator', 'admin'].includes(user.role)) {
    throw new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED')
  }
}

function metric(key, label, value, description) {
  return { key, label, value, description }
}

async function getStudentSummary(user, now) {
  const enrollments = await Enrollment.find({
    studentId: user._id,
    status: 'enrolled',
  }).select('courseOfferingId').lean()
  const enrolledOfferingIds = enrollments.map((item) => item.courseOfferingId)
  const activeOfferings = await CourseOffering.find({ _id: { $in: enrolledOfferingIds }, isActive: true }).select('_id').lean()
  const offeringIds = activeOfferings.map((item) => item._id)

  const [activeCourseCount, attendanceGroups, dueAssignments, announcementIds, upcomingRegistrations] = await Promise.all([
    CourseOffering.countDocuments({ _id: { $in: offeringIds }, isActive: true }),
    AttendanceRecord.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(user._id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    offeringIds.length
      ? Assignment.find({
          courseOfferingId: { $in: offeringIds },
          status: 'published',
          dueDate: { $gte: now },
        }).select('_id').lean()
      : [],
    (async () => {
      const visibleScopes = [{ scope: 'institution' }]
      if (user.departmentId) {
        visibleScopes.push({ scope: 'department', departmentId: user.departmentId })
      }
      if (offeringIds.length) {
        visibleScopes.push({ scope: 'course', courseOfferingId: { $in: offeringIds } })
      }
      return Announcement.find({
        $and: [
          { $or: visibleScopes },
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        ],
      }).distinct('_id')
    })(),
    EventRegistration.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(user._id), status: 'registered' } },
      { $lookup: { from: Event.collection.name, localField: 'eventId', foreignField: '_id', as: 'event' } },
      { $unwind: '$event' },
      { $match: { 'event.status': 'published', 'event.startsAt': { $gte: now } } },
      { $count: 'count' },
    ]),
  ])

  const submittedAssignmentIds = dueAssignments.length
    ? await Submission.distinct('assignmentId', {
        studentId: user._id,
        assignmentId: { $in: dueAssignments.map((item) => item._id) },
      })
    : []
  const readAnnouncementCount = announcementIds.length
    ? await AnnouncementRead.countDocuments({
        studentId: user._id,
        announcementId: { $in: announcementIds },
      })
    : 0

  const attendance = Object.fromEntries(attendanceGroups.map((item) => [item._id, item.count]))
  const attendanceDenominator = (attendance.present || 0) + (attendance.late || 0) + (attendance.absent || 0)
  const attendancePercentage = attendanceDenominator
    ? Math.round((((attendance.present || 0) + (attendance.late || 0)) / attendanceDenominator) * 100)
    : null

  return [
    metric('enrolledCourses', 'Enrolled courses', activeCourseCount, 'Currently active course offerings'),
    metric('attendance', 'Attendance', attendancePercentage == null ? '—' : `${attendancePercentage}%`, 'Excused sessions are excluded from the calculation'),
    metric('openAssignments', 'Open assignments', Math.max(0, dueAssignments.length - submittedAssignmentIds.length), 'Published assignments not yet submitted'),
    metric('unreadAnnouncements', 'Unread notices', Math.max(0, announcementIds.length - readAnnouncementCount), 'Visible, unexpired announcements'),
    metric('upcomingEvents', 'Registered events', upcomingRegistrations[0]?.count || 0, 'Upcoming events you have registered for'),
  ]
}

async function getFacultySummary(user, now) {
  const assignments = await FacultyCourse.find({ facultyId: user._id, isActive: true })
    .select('courseOfferingId').lean()
  const assignedOfferingIds = assignments.map((item) => item.courseOfferingId)
  const activeOfferingDocs = await CourseOffering.find({ _id: { $in: assignedOfferingIds }, isActive: true }).select('_id').lean()
  const offeringIds = activeOfferingDocs.map((item) => item._id)
  const [activeOfferings, studentIds, assignmentIds, monthSessions] = await Promise.all([
    CourseOffering.countDocuments({ _id: { $in: offeringIds }, isActive: true }),
    offeringIds.length ? Enrollment.distinct('studentId', {
      courseOfferingId: { $in: offeringIds },
      status: 'enrolled',
    }) : [],
    Assignment.distinct('_id', { facultyId: user._id, courseOfferingId: { $in: offeringIds }, status: 'published' }),
    AttendanceSession.countDocuments({
      facultyId: user._id,
      sessionDate: { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) },
    }),
  ])
  const pendingReviews = assignmentIds.length
    ? await Submission.countDocuments({ assignmentId: { $in: assignmentIds }, status: 'submitted' })
    : 0

  return [
    metric('assignedCourses', 'Assigned courses', activeOfferings, 'Active course offerings assigned to you'),
    metric('students', 'Students', studentIds.length, 'Unique actively enrolled students across your courses'),
    metric('pendingReviews', 'Pending reviews', pendingReviews, 'Submissions awaiting evaluation'),
    metric('attendanceSessions', 'Attendance sessions', monthSessions, 'Sessions recorded this month'),
  ]
}

async function getCoordinatorSummary(user, now) {
  if (!user.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(403, 'A valid department assignment is required.', 'DEPARTMENT_REQUIRED')
  }
  const departmentId = user.departmentId
  const departmentCourses = await Course.find({ departmentId, isActive: true }).distinct('_id')
  const departmentOfferingIds = await CourseOffering.find({ courseId: { $in: departmentCourses }, isActive: true }).distinct('_id')
  const assignedFacultyIds = departmentOfferingIds.length
    ? await FacultyCourse.find({ courseOfferingId: { $in: departmentOfferingIds }, isActive: true }).distinct('facultyId')
    : []
  const [students, assignedFaculty, clubs, upcomingEvents, eventIds] = await Promise.all([
    User.countDocuments({ departmentId, role: 'student', isActive: true }),
    User.countDocuments({ _id: { $in: assignedFacultyIds }, role: 'faculty', isActive: true }),
    Club.countDocuments({ departmentId, isActive: true }),
    Event.countDocuments({ departmentId, status: 'published', startsAt: { $gte: now } }),
    Event.find({ departmentId, status: { $in: ['published', 'completed'] } }).distinct('_id'),
  ])
  const registrations = eventIds.length
    ? await EventRegistration.countDocuments({ eventId: { $in: eventIds }, status: 'registered' })
    : 0
  const activeOfferings = await CourseOffering.countDocuments({ courseId: { $in: departmentCourses }, isActive: true })

  return [
    metric('departmentStudents', 'Department students', students, 'Active student accounts in your department'),
    metric('departmentFaculty', 'Assigned faculty', assignedFaculty, 'Active faculty assigned to department course offerings'),
    metric('activeClubs', 'Active clubs', clubs, 'Clubs managed within your department'),
    metric('upcomingEvents', 'Upcoming events', upcomingEvents, 'Published department events'),
    metric('eventRegistrations', 'Event registrations', registrations, 'Active registrations for department events'),
    metric('activeOfferings', 'Active course offerings', activeOfferings, 'Active offerings for department courses'),
  ]
}

async function getAdminSummary(now) {
  const [students, faculty, coordinators, departments, courses, offerings, upcomingEvents, eventIds] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'faculty', isActive: true }),
    User.countDocuments({ role: 'coordinator', isActive: true }),
    Department.countDocuments({ isActive: true }),
    Course.countDocuments({ isActive: true }),
    CourseOffering.countDocuments({ isActive: true }),
    Event.countDocuments({ status: 'published', startsAt: { $gte: now } }),
    Event.find({ status: { $in: ['published', 'completed'] } }).distinct('_id'),
  ])
  const registrations = eventIds.length
    ? await EventRegistration.countDocuments({ eventId: { $in: eventIds }, status: 'registered' })
    : 0
  return [
    metric('students', 'Active students', students, 'Active student accounts'),
    metric('faculty', 'Active faculty', faculty, 'Active faculty accounts'),
    metric('coordinators', 'Active coordinators', coordinators, 'Active coordinator accounts'),
    metric('departments', 'Departments', departments, 'Active academic departments'),
    metric('courses', 'Courses', courses, 'Active course catalog entries'),
    metric('courseOfferings', 'Course offerings', offerings, 'Active academic course offerings'),
    metric('upcomingEvents', 'Upcoming events', upcomingEvents, 'Published events across campus'),
    metric('eventRegistrations', 'Event registrations', registrations, 'Current active event registrations'),
  ]
}

async function getDashboardSummary(user) {
  requireAuthenticatedUser(user)
  const now = new Date()
  let metrics

  if (user.role === 'student') metrics = await getStudentSummary(user, now)
  else if (user.role === 'faculty') metrics = await getFacultySummary(user, now)
  else if (user.role === 'coordinator') metrics = await getCoordinatorSummary(user, now)
  else metrics = await getAdminSummary(now)

  return { role: user.role, generatedAt: now, metrics }
}

module.exports = { getDashboardSummary }
