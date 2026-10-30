const mongoose = require('mongoose')

const ENROLLMENT_STATUSES = ['enrolled', 'completed', 'withdrawn']

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required.'],
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required.'],
    },

    academicYear: {
      type: String,
      required: [true, 'Academic year is required.'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must use the YYYY-YYYY format.'],
      validate: {
        validator(value) {
          if (!/^\d{4}-\d{4}$/.test(value)) return false

          const [startYear, endYear] = value.split('-').map(Number)
          return endYear === startYear + 1
        },
        message: 'Academic year must contain consecutive years.',
      },
    },

    semester: {
      type: Number,
      required: [true, 'Semester is required.'],
      min: 1,
      max: 8,
      validate: {
        validator: Number.isInteger,
        message: 'Semester must be a whole number.',
      },
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

// Preserve one enrollment record for a student, course and term.
// A withdrawn student can be re-enrolled by updating this record.
enrollmentSchema.index(
  {
    studentId: 1,
    courseId: 1,
    academicYear: 1,
    semester: 1,
  },
  {
    unique: true,
  },
)

// Supports finding a student's enrollments for an academic term.
enrollmentSchema.index({
  studentId: 1,
  academicYear: 1,
  semester: 1,
  status: 1,
})

// Supports finding enrolled students in a course.
enrollmentSchema.index({
  courseId: 1,
  academicYear: 1,
  semester: 1,
  status: 1,
})

const Enrollment = mongoose.model('Enrollment', enrollmentSchema)

module.exports = Enrollment
module.exports.ENROLLMENT_STATUSES = ENROLLMENT_STATUSES
