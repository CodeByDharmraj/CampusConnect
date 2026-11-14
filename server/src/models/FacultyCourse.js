const mongoose = require('mongoose')

const facultyCourseSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty reference is required.'],
    },

    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering reference is required.'],
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

// Prevent duplicate active assignments for the same faculty and offering.
facultyCourseSchema.index(
  {
    facultyId: 1,
    courseOfferingId: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  },
)

// Supports finding active faculty assigned to an offering.
facultyCourseSchema.index({
  courseOfferingId: 1,
  isActive: 1,
})

// Supports finding a faculty member's active assignments.
facultyCourseSchema.index({
  facultyId: 1,
  isActive: 1,
})

const FacultyCourse = mongoose.model('FacultyCourse', facultyCourseSchema)

module.exports = FacultyCourse
