const mongoose = require('mongoose')

const courseOfferingSchema = new mongoose.Schema(
  {
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

    section: {
      type: String,
      required: [true, 'Section is required.'],
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 10,
      match: [
        /^[A-Z0-9-]+$/,
        'Section must contain only letters, numbers or hyphens.',
      ],
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

// One offering per course, academic year, semester and section.
courseOfferingSchema.index(
  {
    courseId: 1,
    academicYear: 1,
    semester: 1,
    section: 1,
  },
  {
    unique: true,
  },
)

// Supports listing active offerings for an academic term.
courseOfferingSchema.index({
  academicYear: 1,
  semester: 1,
  isActive: 1,
})

const CourseOffering = mongoose.model('CourseOffering', courseOfferingSchema)

module.exports = CourseOffering
