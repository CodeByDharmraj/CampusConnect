const mongoose = require('mongoose')

const ANNOUNCEMENT_SCOPES = ['institution', 'department', 'course']

const ANNOUNCEMENT_CATEGORIES = [
  'Academic',
  'Campus',
  'Course update',
  'Teaching',
]

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },

    detail: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000,
    },

    category: {
      type: String,
      enum: ANNOUNCEMENT_CATEGORIES,
      required: true,
    },

    scope: {
      type: String,
      enum: ANNOUNCEMENT_SCOPES,
      required: true,
    },

    // Set by the backend according to the authenticated user's role.
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Required only for department announcements.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      validate: {
        validator(value) {
          return this.scope === 'department' ? value != null : value == null
        },
        message:
          'Department announcements require a department and other scopes must not contain one.',
      },
    },

    // Required only for course announcements.
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      default: null,
      validate: {
        validator(value) {
          return this.scope === 'course' ? value != null : value == null
        },
        message:
          'Course announcements require a course offering and other scopes must not contain one.',
      },
    },

    publishedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Supports the institution-wide feed and the common scope + newest-first sort.
announcementSchema.index({
  scope: 1,
  publishedAt: -1,
})

announcementSchema.index({
  scope: 1,
  departmentId: 1,
  publishedAt: -1,
})

announcementSchema.index({
  scope: 1,
  courseOfferingId: 1,
  publishedAt: -1,
})

announcementSchema.index({
  expiresAt: 1,
})

const Announcement = mongoose.model('Announcement', announcementSchema)

module.exports = Announcement
module.exports.ANNOUNCEMENT_SCOPES = ANNOUNCEMENT_SCOPES
module.exports.ANNOUNCEMENT_CATEGORIES = ANNOUNCEMENT_CATEGORIES
