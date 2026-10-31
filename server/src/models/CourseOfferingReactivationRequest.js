const mongoose = require('mongoose')

const REACTIVATION_REQUEST_STATUSES = ['pending', 'approved', 'rejected']

const courseOfferingReactivationRequestSchema = new mongoose.Schema(
  {
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering reference is required.'],
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requesting coordinator is required.'],
    },

    requestReason: {
      type: String,
      required: [true, 'Reactivation request reason is required.'],
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: {
        values: REACTIVATION_REQUEST_STATUSES,
        message: 'Invalid reactivation request status.',
      },
      default: 'pending',
      required: true,
    },

    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    decidedAt: {
      type: Date,
      default: null,
    },

    decisionReason: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Only one pending request may exist for an offering.
// Rejected and approved requests remain as historical records.
courseOfferingReactivationRequestSchema.index(
  { courseOfferingId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  },
)

// Supports reviewing requests by status and submission date.
courseOfferingReactivationRequestSchema.index({
  status: 1,
  createdAt: -1,
})

// Supports viewing an offering's complete request history.
courseOfferingReactivationRequestSchema.index({
  courseOfferingId: 1,
  createdAt: -1,
})

// A decided request must contain a complete decision audit.
courseOfferingReactivationRequestSchema.pre('validate', function () {
  if (this.status === 'pending') {
    if (this.decidedBy || this.decidedAt || this.decisionReason) {
      this.invalidate(
        'status',
        'A pending request cannot contain decision details.',
      )
    }

    return
  }

  if (!this.decidedBy) {
    this.invalidate('decidedBy', 'The deciding administrator is required.')
  }

  if (!this.decidedAt) {
    this.invalidate('decidedAt', 'The decision timestamp is required.')
  }

  if (!this.decisionReason) {
    this.invalidate('decisionReason', 'The decision reason is required.')
  }
})

const CourseOfferingReactivationRequest = mongoose.model(
  'CourseOfferingReactivationRequest',
  courseOfferingReactivationRequestSchema,
)

module.exports = CourseOfferingReactivationRequest
module.exports.REACTIVATION_REQUEST_STATUSES = REACTIVATION_REQUEST_STATUSES
