const mongoose = require('mongoose')

const EVENT_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Social',
  'Entrepreneurship',
  'Workshop',
  'Seminar',
  'Other',
]

const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'completed']

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 10000,
    },

    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
    },

    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },

    // Derived from the authenticated user; never accepted from the request body.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    endsAt: {
      type: Date,
      required: true,
    },

    venue: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    capacity: {
      type: Number,
      min: 1,
      max: 100000,
      default: null,
      validate: {
        validator(value) {
          return value == null || value >= (this.registeredCount || 0)
        },
        message: 'Capacity cannot be lower than the current registration count.',
      },
    },

    // Updated only by the registration service inside a MongoDB transaction.
    registeredCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    registrationOpensAt: {
      type: Date,
      default: null,
    },

    registrationClosesAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'draft',
      required: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

// Supports the public upcoming-event feed and department/club management views.
eventSchema.index({ status: 1, startsAt: 1 })
eventSchema.index({ departmentId: 1, status: 1, startsAt: 1 })
eventSchema.index({ clubId: 1, status: 1, startsAt: 1 })
eventSchema.index({ createdBy: 1, createdAt: -1 })

// Keep event dates and registration windows internally consistent.
eventSchema.pre('validate', function validateEventTimeline() {
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    this.invalidate('endsAt', 'Event end time must be after its start time.')
  }

  if (
    this.registrationOpensAt &&
    this.registrationClosesAt &&
    this.registrationClosesAt <= this.registrationOpensAt
  ) {
    this.invalidate(
      'registrationClosesAt',
      'Registration closing time must be after its opening time.',
    )
  }

  if (this.registrationClosesAt && this.startsAt && this.registrationClosesAt > this.startsAt) {
    this.invalidate(
      'registrationClosesAt',
      'Registration must close before the event starts.',
    )
  }

  if (this.registrationOpensAt && this.startsAt && this.registrationOpensAt >= this.startsAt) {
    this.invalidate(
      'registrationOpensAt',
      'Registration must open before the event starts.',
    )
  }
})

const Event = mongoose.model('Event', eventSchema)

module.exports = Event
module.exports.EVENT_CATEGORIES = EVENT_CATEGORIES
module.exports.EVENT_STATUSES = EVENT_STATUSES
