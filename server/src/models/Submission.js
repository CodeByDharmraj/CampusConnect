const mongoose = require('mongoose')

const submissionFileSchema = new mongoose.Schema(
  {
    objectKey: {
      type: String,
      required: [true, 'Storage object key is required.'],
      trim: true,
      maxlength: 500,
    },

    originalName: {
      type: String,
      required: [true, 'Original file name is required.'],
      trim: true,
      maxlength: 255,
    },

    contentType: {
      type: String,
      required: [true, 'File content type is required.'],
      trim: true,
    },

    size: {
      type: Number,
      required: [true, 'File size is required.'],
      min: [1, 'File must not be empty.'],
      max: [10 * 1024 * 1024, 'File cannot exceed 10 MB.'],
    },

    etag: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
)

const submissionVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },

    file: {
      type: submissionFileSchema,
      required: true,
    },

    submittedAt: {
      type: Date,
      required: true,
    },

    isLate: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
  },
)

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment is required.'],
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required.'],
      index: true,
    },

    // All submission attempts are retained for academic history.
    versions: {
      type: [submissionVersionSchema],
      required: true,
      validate: {
        validator(versions) {
          return Array.isArray(versions) && versions.length > 0
        },
        message: 'At least one submission version is required.',
      },
    },

    currentVersion: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // Summary of the latest submission.
    submittedAt: {
      type: Date,
      required: true,
    },

    isLate: {
      type: Boolean,
      required: true,
      default: false,
    },

    status: {
      type: String,
      enum: {
        values: ['submitted', 'evaluated'],
        message: 'Submission status must be submitted or evaluated.',
      },
      default: 'submitted',
      required: true,
    },

    grade: {
      type: Number,
      default: null,
      min: [0, 'Grade cannot be negative.'],
    },

    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Feedback cannot exceed 5000 characters.'],
    },

    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// One submission record per student per assignment.
// Resubmissions are stored as additional versions in the same document.
submissionSchema.index(
  {
    assignmentId: 1,
    studentId: 1,
  },
  {
    unique: true,
    name: 'unique_student_assignment_submission',
  },
)

// Supports faculty review lists for an assignment.
submissionSchema.index(
  {
    assignmentId: 1,
    status: 1,
    submittedAt: -1,
  },
  {
    name: 'assignment_submission_review_lookup',
  },
)

// Supports a student's submission history.
submissionSchema.index(
  {
    studentId: 1,
    submittedAt: -1,
  },
  {
    name: 'student_submission_history',
  },
)

const Submission = mongoose.model('Submission', submissionSchema)

module.exports = Submission
