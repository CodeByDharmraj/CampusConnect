const mongoose = require('mongoose')

const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const TimetableEntry = require('../models/TimetableEntry')

const AttendanceSession = require('../models/AttendanceSession')
const AttendanceRecord = require('../models/AttendanceRecord')
const AttendanceCorrectionRequest = require('../models/AttendanceCorrectionRequest')

const ApiError = require('../utils/ApiError')

const VIEWER_ROLES = ['student', 'faculty', 'coordinator', 'admin']

function requireUser(user) {
  if (!user?._id || !VIEWER_ROLES.includes(user.role)) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }
}

function requireFaculty(user) {
  requireUser(user)

  if (user.role !== 'faculty') {
    throw new ApiError(
      403,
      'Only faculty can perform this operation.',
      'FORBIDDEN',
    )
  }
}

function requireStudent(user) {
  requireUser(user)

  if (user.role !== 'student') {
    throw new ApiError(
      403,
      'Only students can perform this operation.',
      'FORBIDDEN',
    )
  }
}

function requireValidId(id, message = 'Invalid resource ID.') {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, message, 'VALIDATION_ERROR')
  }
}

async function getActiveOffering(courseOfferingId) {
  const offering = await CourseOffering.findOne({
    _id: courseOfferingId,
    isActive: true,
  }).lean()

  if (!offering) {
    throw new ApiError(
      404,
      'Active course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  const course = await Course.findOne({
    _id: offering.courseId,
    isActive: true,
  }).lean()

  if (!course) {
    throw new ApiError(404, 'Active course not found.', 'COURSE_NOT_FOUND')
  }

  return { offering, course }
}

async function requireFacultyAssignment(facultyId, courseOfferingId) {
  const assignment = await FacultyCourse.findOne({
    facultyId,
    courseOfferingId,
    isActive: true,
  }).lean()

  if (!assignment) {
    throw new ApiError(
      403,
      'You are not assigned to this course offering.',
      'FACULTY_ASSIGNMENT_REQUIRED',
    )
  }
}

async function getStudentEnrollment(studentId, courseOfferingId) {
  const enrollment = await Enrollment.findOne({
    studentId,
    courseOfferingId,
    status: 'enrolled',
  }).lean()

  if (!enrollment) {
    throw new ApiError(
      403,
      'You are not actively enrolled in this course offering.',
      'ENROLLMENT_REQUIRED',
    )
  }

  return enrollment
}

async function getCoordinatorOfferingIds(user) {
  if (!user.departmentId) {
    throw new ApiError(403, 'Coordinator department is missing.', 'FORBIDDEN')
  }

  const courses = await Course.find({
    departmentId: user.departmentId,
    isActive: true,
  })
    .select('_id')
    .lean()

  if (!courses.length) return []

  const offerings = await CourseOffering.find({
    courseId: { $in: courses.map((course) => course._id) },
    isActive: true,
  })
    .select('_id')
    .lean()

  return offerings.map((offering) => offering._id)
}

async function getVisibleOfferingIds(user) {
  if (user.role === 'admin') return null

  if (user.role === 'coordinator') {
    return getCoordinatorOfferingIds(user)
  }

  if (user.role === 'faculty') {
    const assignments = await FacultyCourse.find({
      facultyId: user._id,
      isActive: true,
    })
      .select('courseOfferingId')
      .lean()

    return assignments.map((item) => item.courseOfferingId)
  }

  const enrollments = await Enrollment.find({
    studentId: user._id,
    status: 'enrolled',
  })
    .select('courseOfferingId')
    .lean()

  return enrollments.map((item) => item.courseOfferingId)
}

/**
 * Faculty creates a session and submits one attendance status
 * for every currently enrolled student.
 */

async function createAttendanceSession(user, input) {
  requireFaculty(user)

  const { offering } = await getActiveOffering(input.courseOfferingId)

  await requireFacultyAssignment(user._id, offering._id)

  if (input.timetableEntryId) {
    const timetableEntry = await TimetableEntry.findOne({
      _id: input.timetableEntryId,
      courseOfferingId: offering._id,
      facultyId: user._id,
      isActive: true,
    }).lean()

    if (!timetableEntry) {
      throw new ApiError(
        400,
        'The selected timetable entry does not belong to your assigned class.',
        'INVALID_TIMETABLE_ENTRY',
      )
    }
  }

  const enrollments = await Enrollment.find({
    courseOfferingId: offering._id,
    status: 'enrolled',
  })
    .select('_id studentId')
    .lean()

  if (!enrollments.length) {
    throw new ApiError(
      409,
      'There are no actively enrolled students.',
      'NO_ENROLLED_STUDENTS',
    )
  }

  const enrollmentByStudent = new Map(
    enrollments.map((item) => [String(item.studentId), item]),
  )

  if (input.attendance.length !== enrollments.length) {
    throw new ApiError(
      400,
      'Attendance must be submitted for every actively enrolled student.',
      'INCOMPLETE_ATTENDANCE',
    )
  }

  const records = input.attendance.map((item) => {
    const enrollment = enrollmentByStudent.get(String(item.studentId))

    if (!enrollment) {
      throw new ApiError(
        400,
        'An attendance entry belongs to a student who is not enrolled in this offering.',
        'STUDENT_NOT_ENROLLED',
      )
    }

    return {
      studentId: enrollment.studentId,
      enrollmentId: enrollment._id,
      status: item.status,
    }
  })

  const mongoSession = await mongoose.startSession()
  let createdSessionId

  try {
    await mongoSession.withTransaction(async () => {
      const [session] = await AttendanceSession.create(
        [
          {
            courseOfferingId: offering._id,
            facultyId: user._id,
            timetableEntryId: input.timetableEntryId,
            sessionDate: input.sessionDate,
            startTime: input.startTime,
            endTime: input.endTime,
            topic: input.topic,
            notes: input.notes,
            status: 'finalized',
            finalizedAt: new Date(),
          },
        ],
        { session: mongoSession },
      )

      createdSessionId = session._id

      await AttendanceRecord.insertMany(
        records.map((record) => ({
          ...record,
          sessionId: session._id,
          markedBy: user._id,
        })),
        {
          session: mongoSession,
          ordered: true,
        },
      )
    })
  } finally {
    await mongoSession.endSession()
  }

  return getAttendanceSession(user, createdSessionId)
}


/**
 * Returns sessions visible to the authenticated user's role.
 */
async function getAttendanceSessions(user, filters = {}) {
  requireUser(user)

  const offeringIds = await getVisibleOfferingIds(user)

  if (offeringIds !== null && offeringIds.length === 0) return []

  const query = {}

  if (offeringIds !== null) {
    query.courseOfferingId = { $in: offeringIds }
  }

  if (filters.courseOfferingId) {
    requireValidId(filters.courseOfferingId, 'Course offering ID is invalid.')

    if (
      offeringIds !== null &&
      !offeringIds.some((id) => String(id) === String(filters.courseOfferingId))
    ) {
      throw new ApiError(
        404,
        'Attendance sessions not found.',
        'ATTENDANCE_NOT_FOUND',
      )
    }

    query.courseOfferingId = filters.courseOfferingId
  }

  if (filters.from || filters.to) {
    query.sessionDate = {}

    if (filters.from) query.sessionDate.$gte = new Date(filters.from)
    if (filters.to) query.sessionDate.$lte = new Date(filters.to)
  }

  return AttendanceSession.find(query)
    .populate({
      path: 'courseOfferingId',
      select: 'courseId academicYear semester section',
      populate: {
        path: 'courseId',
        select: 'name code departmentId',
      },
    })
    .populate('facultyId', 'name email')
    .sort({ sessionDate: -1, startTime: -1 })
    .lean()
}

/**
 * Retrieves one session and its student records.
 * Students receive only their own record.
 */
async function getAttendanceSession(user, sessionId) {
  requireUser(user)
  requireValidId(sessionId, 'Attendance session ID is invalid.')

  const session = await AttendanceSession.findById(sessionId)
    .populate({
      path: 'courseOfferingId',
      select: 'courseId academicYear semester section',
      populate: {
        path: 'courseId',
        select: 'name code departmentId',
      },
    })
    .populate('facultyId', 'name email')
    .lean()

  if (!session || !session.courseOfferingId) {
    throw new ApiError(
      404,
      'Attendance session not found.',
      'ATTENDANCE_NOT_FOUND',
    )
  }

  if (user.role === 'student') {
    await getStudentEnrollment(user._id, session.courseOfferingId._id)
  } else if (user.role === 'faculty') {
    await requireFacultyAssignment(user._id, session.courseOfferingId._id)
  } else if (user.role === 'coordinator') {
    const departmentId = session.courseOfferingId.courseId?.departmentId

    if (String(departmentId) !== String(user.departmentId)) {
      throw new ApiError(
        404,
        'Attendance session not found.',
        'ATTENDANCE_NOT_FOUND',
      )
    }
  }

  const recordFilter = { sessionId: session._id }

  if (user.role === 'student') {
    recordFilter.studentId = user._id
  }

  const records = await AttendanceRecord.find(recordFilter)
    .populate('studentId', 'name email')
    .sort({ 'studentId.name': 1 })
    .lean()

  return { ...session, records }
}

/**
 * Student retrieves their own attendance history.
 */
async function getMyAttendance(user) {
  requireStudent(user)

  const enrollments = await Enrollment.find({
    studentId: user._id,
    status: { $in: ['enrolled', 'completed'] },
  })
    .select('_id courseOfferingId status')
    .lean()

  if (!enrollments.length) return []

  const enrollmentIds = enrollments.map((item) => item._id)

  const records = await AttendanceRecord.find({
    studentId: user._id,
    enrollmentId: { $in: enrollmentIds },
  })
    .populate({
      path: 'sessionId',
      select: 'courseOfferingId sessionDate startTime endTime topic',
      populate: {
        path: 'courseOfferingId',
        select: 'courseId academicYear semester section',
        populate: {
          path: 'courseId',
          select: 'name code',
        },
      },
    })
    .sort({ createdAt: -1 })
    .lean()

  return records.filter((record) => record.sessionId)
}

/**
 * Faculty retrieves correction requests for their assigned offerings.
 */
async function getCorrectionRequests(user) {
  requireUser(user)

  const query =
    user.role === 'student' ? { studentId: user._id } : { status: 'pending' }

  if (user.role === 'student') {
    query.studentId = user._id
  } else if (user.role === 'faculty') {
    const assignments = await FacultyCourse.find({
      facultyId: user._id,
      isActive: true,
    })
      .select('courseOfferingId')
      .lean()

    const sessionIds = await AttendanceSession.find({
      courseOfferingId: {
        $in: assignments.map((item) => item.courseOfferingId),
      },
      facultyId: user._id,
    }).distinct('_id')

    query.attendanceRecordId = {
      $in: await AttendanceRecord.find({
        sessionId: { $in: sessionIds },
      }).distinct('_id'),
    }
  } else if (user.role === 'coordinator') {
    const offeringIds = await getCoordinatorOfferingIds(user)

    const sessionIds = await AttendanceSession.find({
      courseOfferingId: { $in: offeringIds },
    }).distinct('_id')

    query.attendanceRecordId = {
      $in: await AttendanceRecord.find({
        sessionId: { $in: sessionIds },
      }).distinct('_id'),
    }
  }

  return AttendanceCorrectionRequest.find(query)
    .populate('studentId', 'name email')
    .populate({
      path: 'attendanceRecordId',
      populate: {
        path: 'sessionId',
        select: 'courseOfferingId sessionDate startTime',
        populate: {
          path: 'courseOfferingId',
          select: 'courseId academicYear semester section',
          populate: { path: 'courseId', select: 'name code' },
        },
      },
    })
    .sort({ createdAt: -1 })
    .lean()
}

/**
 * Student requests a correction to their own attendance.
 */
async function createCorrectionRequest(user, recordId, input) {
  requireStudent(user)
  requireValidId(recordId, 'Attendance record ID is invalid.')

  const record = await AttendanceRecord.findOne({
    _id: recordId,
    studentId: user._id,
  })

  if (!record) {
    throw new ApiError(
      404,
      'Attendance record not found.',
      'ATTENDANCE_RECORD_NOT_FOUND',
    )
  }

  if (record.status === input.requestedStatus) {
    throw new ApiError(
      400,
      'Requested status is already recorded.',
      'ATTENDANCE_STATUS_UNCHANGED',
    )
  }

  const session = await AttendanceSession.findById(record.sessionId).lean()

  if (!session || session.status !== 'finalized') {
    throw new ApiError(
      409,
      'This attendance session cannot be corrected.',
      'SESSION_NOT_FINALIZED',
    )
  }

  return AttendanceCorrectionRequest.create({
    attendanceRecordId: record._id,
    studentId: user._id,
    currentStatus: record.status,
    requestedStatus: input.requestedStatus,
    reason: input.reason,
  })
}

/**
 * Only the faculty member assigned to the session can review its request.
 */

async function reviewCorrectionRequest(user, requestId, input) {
  requireFaculty(user)
  requireValidId(requestId, 'Correction request ID is invalid.')

  const mongoSession = await mongoose.startSession()
  let reviewedRequestId

  try {
    await mongoSession.withTransaction(async () => {
      const request = await AttendanceCorrectionRequest.findOne({
        _id: requestId,
        status: 'pending',
      }).session(mongoSession)

      if (!request) {
        throw new ApiError(
          409,
          'This correction request has already been reviewed or is no longer available.',
          'CORRECTION_ALREADY_REVIEWED',
        )
      }

      const record = await AttendanceRecord.findById(
        request.attendanceRecordId,
      ).session(mongoSession)

      if (!record) {
        throw new ApiError(
          404,
          'Attendance record not found.',
          'ATTENDANCE_RECORD_NOT_FOUND',
        )
      }

      const attendanceSession = await AttendanceSession.findOne({
        _id: record.sessionId,
        facultyId: user._id,
      }).session(mongoSession)

      if (!attendanceSession) {
        throw new ApiError(
          403,
          'You are not authorized to review this request.',
          'FORBIDDEN',
        )
      }

      // Claim the pending request using a conditional update.
      // A concurrent reviewer cannot successfully claim it again.
      const updatedRequest = await AttendanceCorrectionRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: 'pending',
        },
        {
          $set: {
            status: input.decision,
            reviewedBy: user._id,
            reviewedAt: new Date(),
            reviewRemarks: input.reviewRemarks,
          },
        },
        {
          new: true,
          runValidators: true,
          session: mongoSession,
        },
      )

      if (!updatedRequest) {
        throw new ApiError(
          409,
          'This correction request has already been reviewed.',
          'CORRECTION_ALREADY_REVIEWED',
        )
      }

      if (input.decision === 'approved') {
        // Only update the record if it still has the status
        // that the student originally requested to correct.
        const updateResult = await AttendanceRecord.updateOne(
          {
            _id: record._id,
            status: request.currentStatus,
          },
          {
            $set: {
              status: request.requestedStatus,
              markedBy: user._id,
              markedAt: new Date(),
            },
            $push: {
              correctionHistory: {
                previousStatus: request.currentStatus,
                newStatus: request.requestedStatus,
                changedBy: user._id,
                reason: request.reason,
                changedAt: new Date(),
              },
            },
          },
          {
            session: mongoSession,
            runValidators: true,
          },
        )

        if (updateResult.modifiedCount !== 1) {
          throw new ApiError(
            409,
            'The attendance record changed after this request was submitted. Please review the latest record.',
            'ATTENDANCE_RECORD_CHANGED',
          )
        }
      }

      reviewedRequestId = updatedRequest._id
    })
  } finally {
    await mongoSession.endSession()
  }

  return AttendanceCorrectionRequest.findById(reviewedRequestId)
    .populate('studentId', 'name email')
    .lean()
}


/**
 * Attendance overview for administrative and departmental dashboards.
 * This is read-only; it never changes attendance data.
 */
async function getAttendanceOverview(user) {
  requireUser(user)

  const offeringIds = await getVisibleOfferingIds(user)

  const sessionFilter =
    offeringIds === null ? {} : { courseOfferingId: { $in: offeringIds } }

  const sessions = await AttendanceSession.find(sessionFilter)
    .select('_id courseOfferingId sessionDate')
    .lean()

  const sessionIds = sessions.map((item) => item._id)

  const [totalSessions, records] = await Promise.all([
    AttendanceSession.countDocuments(sessionFilter),
    AttendanceRecord.find({ sessionId: { $in: sessionIds } })
      .select('status')
      .lean(),
  ])

  const totals = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }

  for (const record of records) {
    totals[record.status] += 1
  }

  const counted = totals.present + totals.absent + totals.late
  const attended = totals.present + totals.late

  return {
    totalSessions,
    totalRecords: records.length,
    totals,
    attendancePercentage: counted
      ? Number(((attended / counted) * 100).toFixed(2))
      : 0,
  }
}


async function getFacultyAttendanceOptions(user) {
  requireFaculty(user)

  const assignments = await FacultyCourse.find({
    facultyId: user._id,
    isActive: true,
  })
    .populate({
      path: 'courseOfferingId',
      match: { isActive: true },
      select: 'courseId academicYear semester section',
      populate: {
        path: 'courseId',
        match: { isActive: true },
        select: 'name code departmentId',
      },
    })
    .lean()

  const offerings = assignments
    .map((assignment) => assignment.courseOfferingId)
    .filter((offering) => offering?.courseId)

  const options = await Promise.all(
    offerings.map(async (offering) => {
      const enrollments = await Enrollment.find({
        courseOfferingId: offering._id,
        status: 'enrolled',
      })
        .populate({
          path: 'studentId',
          match: { isActive: true, role: 'student' },
          select: 'name email',
        })
        .lean()

      return {
        courseOffering: offering,
        students: enrollments
          .filter((enrollment) => enrollment.studentId)
          .map((enrollment) => ({
            enrollmentId: enrollment._id,
            student: enrollment.studentId,
          })),
      }
    }),
  )

  return options
}


module.exports = {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceSession,
  getMyAttendance,
  getCorrectionRequests,
  createCorrectionRequest,
  reviewCorrectionRequest,
  getAttendanceOverview,
  getFacultyAttendanceOptions,
}
