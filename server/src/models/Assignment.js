const mongoose = require('mongoose')

const ASSIGNMENT_STATUSES = ['draft', 'published']

const assignmentSchema = new mongoose.Schema(
  {
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering is required'],
      index: true,
    },

    // Always derived from the authenticated faculty member.
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty owner is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      minlength: [3, 'Title must contain at least 3 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    description: {
      type: String,
      required: [true, 'Assignment description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [10000, 'Instructions cannot exceed 10000 characters'],
    },

    // Optional in drafts; mandatory when publishing.
    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ASSIGNMENT_STATUSES,
        message: 'Status must be draft or published',
      },
      default: 'draft',
      required: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

assignmentSchema.index({
  courseOfferingId: 1,
  status: 1,
  dueDate: 1,
})

assignmentSchema.index({
  facultyId: 1,
  status: 1,
  createdAt: -1,
})

const Assignment = mongoose.model('Assignment', assignmentSchema)

module.exports = Assignment
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES
