const mongoose = require('mongoose')

const REGISTRATION_STATUSES = ['registered', 'cancelled']

const eventRegistrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required.'],
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required.'],
      index: true,
    },

    status: {
      type: String,
      enum: REGISTRATION_STATUSES,
      required: true,
      default: 'registered',
    },

    registeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Keep one durable registration record per student/event pair. A cancelled
// registration can be reactivated instead of creating duplicate history rows.
eventRegistrationSchema.index(
  { eventId: 1, studentId: 1 },
  {
    unique: true,
    name: 'unique_student_event_registration',
  },
)

// Supports a student's registration history and event participant lists.
eventRegistrationSchema.index({ studentId: 1, status: 1, registeredAt: -1 })
eventRegistrationSchema.index({ eventId: 1, status: 1, registeredAt: 1 })

const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema)

module.exports = EventRegistration
module.exports.REGISTRATION_STATUSES = REGISTRATION_STATUSES
