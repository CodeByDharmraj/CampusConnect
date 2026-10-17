import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 10000,
    },

    category: {
      type: String,
      enum: ["general", "academic", "workshop", "urgent"],
      default: "general",
    },

    scope: {
      type: String,
      enum: ["campus", "course"],
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: function () {
        return this.scope === "course";
      },
      validate: {
        validator: function (value) {
          return this.scope === "course" ? Boolean(value) : value == null;
        },
        message: "Campus announcements must not reference a course.",
      },
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

announcementSchema.index({
  scope: 1,
  isPublished: 1,
  publishedAt: -1,
});

announcementSchema.index({
  course: 1,
  isPublished: 1,
  publishedAt: -1,
});

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
