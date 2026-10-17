import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
      default: "student",
    },

    studentId: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "student";
      },
    },

    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    semester: {
      type: Number,
      min: 1,
      max: 12,
      required: function () {
        return this.role === "student";
      },
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

userSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "student" },
  },
);

const User = mongoose.model("User", userSchema);

export default User;
