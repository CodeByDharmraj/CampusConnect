import mongoose from "mongoose";

const courseEnrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "withdrawn"],
      default: "active",
      required: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

courseEnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

courseEnrollmentSchema.index({ course: 1, status: 1 });

const CourseEnrollment = mongoose.model(
  "CourseEnrollment",
  courseEnrollmentSchema,
);

export default CourseEnrollment;
