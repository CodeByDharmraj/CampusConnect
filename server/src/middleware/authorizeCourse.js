import mongoose from "mongoose";
import Course from "../models/Course.js";

export async function requireAssignedFaculty(req, res, next) {
  try {
    const { courseId } = req.params;

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(courseId);

    if (!course || !course.isActive) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Administrators can manage courses under the current policy.
    if (req.user.role === "admin") {
      req.course = course;
      return next();
    }

    // Only faculty assigned to this course may manage it.
    if (
      req.user.role !== "faculty" ||
      course.faculty.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage this course.",
      });
    }

    req.course = course;
    next();
  } catch (error) {
    next(error);
  }
}
