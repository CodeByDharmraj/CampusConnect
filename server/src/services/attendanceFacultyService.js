const mongoose = require('mongoose')

const AttendanceSession = require('../models/AttendanceSession')
const CourseOffering = require('../models/CourseOffering')
const FacultyCourse = require('../models/FacultyCourse')
const Enrollment = require('../models/Enrollment')
const User = require('../models/User')
const ApiError = require('../utils/ApiError')

function requireFaculty(user) {
  if (!user || user.role !== 'faculty' || !user.isActive) {
    throw new ApiError(
      403,
      'Only active faculty members can manage attendance.',
      'FACULTY_ACCESS_REQUIRED',
    )
  }
}

function validateObjectId(id, fieldName = 'ID') {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName}.`, 'INVALID_ID')
  }
}

function validateSessionInput(input) {
  const allowedFields = [
    'courseOfferingId',
    'sessionDate',
    'startTime',
    'endTime',
    'topic',
    'notes',
  ]

  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  )

  if (unknownFields.length) {
    throw new ApiError(
      400,
      `Unexpected fields: ${unknownFields.join(', ')}`,
      'UNKNOWN_FIELDS',
    )
  }

  if (!input.courseOfferingId || !input.sessionDate) {
    throw new ApiError(
      400,
      'Course offering and session date are required.',
      'MISSING_SESSION_FIELDS',
    )
  }

  validateObjectId(input.courseOfferingId, 'course offering ID')

  if (!input.startTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) {
    throw new ApiError(400, 'A valid start time is required.', 'INVALID_TIME')
  }

  if (!input.endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.endTime)) {
    throw new ApiError(400, 'A valid end time is required.', 'INVALID_TIME')
  }

  if (input.startTime >= input.endTime) {
    throw new ApiError(
      400,
      'Session end time must be later than start time.',
      'INVALID_SESSION_DURATION',
    )
  }

  const sessionDate = new Date(input.sessionDate)

  if (Number.isNaN(sessionDate.getTime())) {
    throw new ApiError(400, 'Invalid session date.', 'INVALID_DATE')
  }

  if (input.topic && input.topic.trim().length > 150) {
    throw new ApiError(
      400,
      'Topic cannot exceed 150 characters.',
      'INVALID_TOPIC',
    )
  }

  if (input.notes && input.notes.trim().length > 1000) {
    throw new ApiError(
      400,
      'Notes cannot exceed 1000 characters.',
      'INVALID_NOTES',
    )
  }

  return {
    courseOfferingId: input.courseOfferingId,
    sessionDate,
    startTime: input.startTime,
    endTime: input.endTime,
    topic: input.topic?.trim() || '',
    notes: input.notes?.trim() || '',
  }
}

async function requireActiveFacultyOffering(facultyId, courseOfferingId) {
  const assignment = await FacultyCourse.findOne({
    facultyId,
    courseOfferingId,
    isActive: true,
  })

  if (!assignment) {
    throw new ApiError(
      403,
      'You are not assigned to this course offering.',
      'FACULTY_OFFERING_ACCESS_DENIED',
    )
  }

  const offering = await CourseOffering.findOne({
    _id: courseOfferingId,
    isActive: true,
  }).populate({
    path: 'courseId',
    select: 'courseCode courseName departmentId credits',
  })

  if (!offering || !offering.courseId) {
    throw new ApiError(
      404,
      'Active course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  return offering
}

/**
 * Returns the active course offerings assigned to the faculty member.
 */
async function getFacultyAttendanceOptions(user) {
  requireFaculty(user)

  const assignments = await FacultyCourse.find({
    facultyId: user._id,
    isActive: true,
  })
    .populate({
      path: 'courseOfferingId',
      match: { isActive: true },
      populate: {
        path: 'courseId',
        select: 'courseCode courseName departmentId credits',
      },
    })
    .lean()

  const offerings = assignments
    .filter((assignment) => assignment.courseOfferingId)
    .map((assignment) => assignment.courseOfferingId)

  const options = await Promise.all(
    offerings.map(async (offering) => {
      const enrolledCount = await Enrollment.countDocuments({
        courseOfferingId: offering._id,
        status: 'enrolled',
      })

      return {
        _id: offering._id,
        courseId: offering.courseId,
        academicYear: offering.academicYear,
        semester: offering.semester,
        section: offering.section,
        enrolledCount,
      }
    }),
  )

  return { options }
}

/**
 * Returns the currently enrolled students for a faculty-owned offering.
 */
async function getEnrolledRoster(user, courseOfferingId) {
  requireFaculty(user)
  validateObjectId(courseOfferingId, 'course offering ID')

  const offering = await requireActiveFacultyOffering(
    user._id,
    courseOfferingId,
  )

  const enrollments = await Enrollment.find({
    courseOfferingId,
    status: 'enrolled',
  })
    .select('studentId')
    .lean()

  const studentIds = enrollments.map((enrollment) => enrollment.studentId)

  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    isActive: true,
  })
    .select('name email')
    .sort({ name: 1 })
    .lean()

  return {
    courseOffering: {
      _id: offering._id,
      course: offering.courseId,
      academicYear: offering.academicYear,
      semester: offering.semester,
      section: offering.section,
    },
    students: students.map((student) => ({
      _id: student._id,
      name: student.name,
      email: student.email,
    })),
    totalStudents: students.length,
  }
}

/**
 * Creates an attendance session for an assigned course offering.
 * Attendance records are created later by the bulk-marking workflow.
 */
async function createAttendanceSession(user, input) {
  requireFaculty(user)

  const data = validateSessionInput(input)

  const offering = await requireActiveFacultyOffering(
    user._id,
    data.courseOfferingId,
  )

  const enrolledCount = await Enrollment.countDocuments({
    courseOfferingId: offering._id,
    status: 'enrolled',
  })

  if (enrolledCount === 0) {
    throw new ApiError(
      400,
      'Cannot create an attendance session because no students are enrolled.',
      'EMPTY_ENROLLMENT',
    )
  }

  const session = await AttendanceSession.create({
    courseOfferingId: offering._id,
    facultyId: user._id,
    sessionDate: data.sessionDate,
    startTime: data.startTime,
    endTime: data.endTime,
    topic: data.topic,
    notes: data.notes,
  })

  return {
    session: {
      _id: session._id,
      courseOfferingId: session.courseOfferingId,
      facultyId: session.facultyId,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      topic: session.topic,
      notes: session.notes,
      createdAt: session.createdAt,
    },
    enrolledCount,
  }
}

module.exports = {
  getFacultyAttendanceOptions,
  getEnrolledRoster,
  createAttendanceSession,
}
