const mongoose = require('mongoose')

const announcementReadSchema = new mongoose.Schema(
  {
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    readAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

announcementReadSchema.index(
  {
    announcementId: 1,
    studentId: 1,
  },
  {
    unique: true,
  },
)

announcementReadSchema.index({
  studentId: 1,
  readAt: -1,
})

const AnnouncementRead = mongoose.model(
  'AnnouncementRead',
  announcementReadSchema,
)

module.exports = AnnouncementRead
