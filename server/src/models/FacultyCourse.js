const mongoose = require('mongoose')

const facultyCourseSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty reference is required.'],
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

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Prevents duplicate active assignments for the same
// faculty, course and academic period.
facultyCourseSchema.index(
  {
    facultyId: 1,
    courseId: 1,
    academicYear: 1,
    semester: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  },
)

// Supports finding active faculty assignments for a course.
facultyCourseSchema.index({
  courseId: 1,
  academicYear: 1,
  semester: 1,
  isActive: 1,
})

// Supports finding a faculty member's active assignments.
facultyCourseSchema.index({
  facultyId: 1,
  academicYear: 1,
  semester: 1,
  isActive: 1,
})

const FacultyCourse = mongoose.model('FacultyCourse', facultyCourseSchema)

module.exports = FacultyCourse
