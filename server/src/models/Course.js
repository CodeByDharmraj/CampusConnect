import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

courseSchema.index({ code: 1, semester: 1, department: 1 }, { unique: true });

courseSchema.index({ faculty: 1, isActive: 1 });

const Course = mongoose.model("Course", courseSchema);

export default Course;
