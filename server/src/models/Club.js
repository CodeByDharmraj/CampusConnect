const mongoose = require('mongoose')

const CLUB_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Social',
  'Entrepreneurship',
  'Other',
]

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      immutable: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: CLUB_CATEGORIES,
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },

    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

clubSchema.index({ isActive: 1, category: 1, name: 1 })
clubSchema.index({ departmentId: 1, isActive: 1, name: 1 })

const Club = mongoose.model('Club', clubSchema)

module.exports = Club
module.exports.CLUB_CATEGORIES = CLUB_CATEGORIES
