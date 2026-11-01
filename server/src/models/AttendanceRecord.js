const mongoose = require('mongoose')

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused']

const attendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: [true, 'Attendance session is required.'],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required.'],
    },

    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required.'],
    },

    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      required: [true, 'Attendance status is required.'],
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty member is required.'],
    },

    markedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    correctionHistory: [
      {
        previousStatus: {
          type: String,
          enum: ATTENDANCE_STATUSES,
          required: true,
        },

        newStatus: {
          type: String,
          enum: ATTENDANCE_STATUSES,
          required: true,
        },

        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        reason: {
          type: String,
          trim: true,
          maxlength: 500,
          default: '',
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// One student can have only one record per attendance session.
attendanceRecordSchema.index(
  {
    sessionId: 1,
    studentId: 1,
  },
  {
    unique: true,
  },
)

attendanceRecordSchema.index({
  studentId: 1,
  createdAt: -1,
})

attendanceRecordSchema.index({
  enrollmentId: 1,
  sessionId: 1,
})

const AttendanceRecord = mongoose.model(
  'AttendanceRecord',
  attendanceRecordSchema,
)

module.exports = AttendanceRecord
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES
