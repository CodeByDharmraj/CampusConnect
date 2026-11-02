const mongoose = require('mongoose')

const EVENT_ATTENDANCE_STATUSES = ['present', 'absent']

const eventAttendanceSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventRegistration',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: EVENT_ATTENDANCE_STATUSES,
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    markedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true },
)

eventAttendanceSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true, name: 'unique_event_student_attendance' },
)
eventAttendanceSchema.index({ eventId: 1, status: 1 })

eventAttendanceSchema.index({ studentId: 1, createdAt: -1 })

const EventAttendance = mongoose.model('EventAttendance', eventAttendanceSchema)

module.exports = EventAttendance
module.exports.EVENT_ATTENDANCE_STATUSES = EVENT_ATTENDANCE_STATUSES
