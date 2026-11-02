const mongoose = require('mongoose')

const courseMaterialSchema = new mongoose.Schema(
  {
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering is required.'],
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required.'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Material title is required.'],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    storageKey: {
      type: String,
      required: [true, 'Storage key is required.'],
      trim: true,
      maxlength: 500,
      select: false,
    },

    originalName: {
      type: String,
      required: [true, 'Original file name is required.'],
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      required: [true, 'File MIME type is required.'],
      trim: true,
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
      max: 10 * 1024 * 1024,
    },

    etag: {
      type: String,
      default: null,
    },

    visibility: {
      type: String,
      enum: ['enrolled', 'faculty'],
      default: 'enrolled',
      required: true,
    },
  },
  { timestamps: true },
)

courseMaterialSchema.index({ courseOfferingId: 1, createdAt: -1 })
courseMaterialSchema.index({ uploadedBy: 1, createdAt: -1 })

module.exports = mongoose.model('CourseMaterial', courseMaterialSchema)
