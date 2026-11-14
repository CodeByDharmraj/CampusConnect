const mongoose = require('mongoose')

const ATTENDANCE_SESSION_STATUSES = ['open', 'finalized']

const attendanceSessionSchema = new mongoose.Schema(
  {
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering is required.'],
      index: true,
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty member is required.'],
    },

    timetableEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimetableEntry',
      default: null,
    },

    sessionDate: {
      type: Date,
      required: [true, 'Attendance date is required.'],
    },

    startTime: {
      type: String,
      required: [true, 'Session start time is required.'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid start time.'],
    },

    endTime: {
      type: String,
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid end time.'],
      default: null,
    },

    topic: {
      type: String,
      trim: true,
      maxlength: [200, 'Topic cannot exceed 200 characters.'],
      default: '',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
      default: '',
    },

    status: {
      type: String,
      enum: ATTENDANCE_SESSION_STATUSES,
      default: 'open',
      required: true,
    },

    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent two sessions for the same offering at the same date and start time.
attendanceSessionSchema.index(
  {
    courseOfferingId: 1,
    sessionDate: 1,
    startTime: 1,
  },
  {
    unique: true,
  },
)

attendanceSessionSchema.index({
  facultyId: 1,
  sessionDate: -1,
})

attendanceSessionSchema.index({
  courseOfferingId: 1,
  sessionDate: -1,
  status: 1,
})

const AttendanceSession = mongoose.model(
  'AttendanceSession',
  attendanceSessionSchema,
)

module.exports = AttendanceSession
module.exports.ATTENDANCE_SESSION_STATUSES = ATTENDANCE_SESSION_STATUSES
