const mongoose = require('mongoose')

const TIMETABLE_MODES = ['offline', 'online', 'hybrid']

const timetableEntrySchema = new mongoose.Schema(
  {
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering is required'],
      index: true,
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty member is required'],
    },

    dayOfWeek: {
      type: Number,
      required: [true, 'Day of week is required'],
      min: [0, 'Day of week must be between 0 and 6'],
      max: [6, 'Day of week must be between 0 and 6'],
      validate: {
        validator: Number.isInteger,
        message: 'Day of week must be an integer',
      },
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must use HH:mm format'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must use HH:mm format'],
      validate: {
        validator: function (value) {
          return !this.startTime || value > this.startTime
        },
        message: 'End time must be later than start time',
      },
    },

    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
      minlength: [1, 'Room cannot be empty'],
      maxlength: [100, 'Room cannot exceed 100 characters'],
    },

    mode: {
      type: String,
      enum: {
        values: TIMETABLE_MODES,
        message: 'Mode must be offline, online or hybrid',
      },
      required: [true, 'Class mode is required'],
      lowercase: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Efficient timetable lookup by course offering.
timetableEntrySchema.index({
  courseOfferingId: 1,
  dayOfWeek: 1,
  startTime: 1,
})

// Efficient timetable lookup by faculty member.
timetableEntrySchema.index({
  facultyId: 1,
  dayOfWeek: 1,
  startTime: 1,
  isActive: 1,
})

// Efficient room availability lookup.
timetableEntrySchema.index({
  room: 1,
  dayOfWeek: 1,
  startTime: 1,
  isActive: 1,
})

const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema)

module.exports = TimetableEntry
module.exports.TIMETABLE_MODES = TIMETABLE_MODES
