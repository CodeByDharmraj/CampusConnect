const mongoose = require('mongoose')

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required.'],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    code: {
      type: String,
      required: [true, 'Course code is required.'],
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 20,
      match: /^[A-Z0-9-]+$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Course department is required.'],
    },

    credits: {
      type: Number,
      required: [true, 'Course credits are required.'],
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: 'Course credits must be a whole number.',
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

// A course code must be unique within its department.
courseSchema.index({ departmentId: 1, code: 1 }, { unique: true })

// Supports department-specific active course queries.
courseSchema.index({ departmentId: 1, isActive: 1, name: 1 })

const Course = mongoose.model('Course', courseSchema)

module.exports = Course
