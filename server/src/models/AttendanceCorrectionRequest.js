const mongoose = require('mongoose')

const CORRECTION_STATUSES = ['pending', 'approved', 'rejected']

const attendanceCorrectionRequestSchema = new mongoose.Schema(
  {
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceRecord',
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    requestedStatus: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
    },

    currentStatus: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      minlength: [10, 'Please provide at least 10 characters.'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters.'],
      required: true,
    },

    status: {
      type: String,
      enum: CORRECTION_STATUSES,
      default: 'pending',
      required: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewRemarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review remarks cannot exceed 1000 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

// Prevent multiple simultaneous pending requests for one record.
attendanceCorrectionRequestSchema.index(
  {
    attendanceRecordId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: 'pending',
    },
  },
)

attendanceCorrectionRequestSchema.index({
  studentId: 1,
  createdAt: -1,
})

attendanceCorrectionRequestSchema.index({
  reviewedBy: 1,
  status: 1,
})

const AttendanceCorrectionRequest = mongoose.model(
  'AttendanceCorrectionRequest',
  attendanceCorrectionRequestSchema,
)

module.exports = AttendanceCorrectionRequest
module.exports.CORRECTION_STATUSES = CORRECTION_STATUSES
