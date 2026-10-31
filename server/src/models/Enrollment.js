const mongoose = require('mongoose')

const ENROLLMENT_STATUSES = ['enrolled', 'completed', 'withdrawn']

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required.'],
    },

    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering reference is required.'],
    },

    status: {
      type: String,
      enum: {
        values: ENROLLMENT_STATUSES,
        message: 'Invalid enrollment status.',
      },
      default: 'enrolled',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// A student can have only one enrollment per course offering.
enrollmentSchema.index(
  {
    studentId: 1,
    courseOfferingId: 1,
  },
  {
    unique: true,
  },
)

// Supports finding a student's enrollments by status.
enrollmentSchema.index({
  studentId: 1,
  status: 1,
})

// Supports finding enrolled students in a course offering.
enrollmentSchema.index({
  courseOfferingId: 1,
  status: 1,
})

const Enrollment = mongoose.model('Enrollment', enrollmentSchema)

module.exports = Enrollment
module.exports.ENROLLMENT_STATUSES = ENROLLMENT_STATUSES
