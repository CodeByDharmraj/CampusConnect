const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required.'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    code: {
      type: String,
      required: [true, 'Department code is required.'],
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 12,
      match: /^[A-Z0-9-]+$/,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
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

// Each department must have a unique code.
departmentSchema.index({ code: 1 }, { unique: true })

// Supports queries for active departments.
departmentSchema.index({ isActive: 1, name: 1 })

const Department = mongoose.model('Department', departmentSchema)

module.exports = Department
