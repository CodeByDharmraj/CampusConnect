import mongoose from "mongoose";

import User from "../models/User.js";
import Course from "../models/Course.js";
import CourseEnrollment from "../models/CourseEnrollment.js";
import Announcement from "../models/Announcement.js";

async function checkModels() {
  const faculty = new User({
    name: "Demo Faculty",
    email: "faculty@example.com",
    passwordHash: "demo-hash-not-a-real-password",
    role: "faculty",
    department: "CSE",
  });

  const student = new User({
    name: "Demo Student",
    email: "student@example.com",
    passwordHash: "demo-hash-not-a-real-password",
    role: "student",
    studentId: "DEMO-001",
    department: "CSE",
    semester: 5,
  });

  const course = new Course({
    code: "CS301",
    title: "Computer Networks",
    faculty: faculty._id,
    department: "CSE",
    semester: 5,
  });

  const enrollment = new CourseEnrollment({
    student: student._id,
    course: course._id,
  });

  const announcement = new Announcement({
    title: "CS301 Workshop",
    body: "Workshop details for enrolled students.",
    scope: "course",
    course: course._id,
    author: faculty._id,
    isPublished: false,
  });

  try {
    await Promise.all([
      faculty.validate(),
      student.validate(),
      course.validate(),
      enrollment.validate(),
      announcement.validate(),
    ]);

    console.log("PASS: all valid sample documents passed.");

    const invalidStudent = new User({
      name: "Invalid Student",
      email: "not-an-email",
      passwordHash: "demo-hash",
      role: "student",
    });

    try {
      await invalidStudent.validate();
      throw new Error("Expected invalid student to fail validation.");
    } catch (error) {
      if (error.name !== "ValidationError") throw error;
      console.log("PASS: invalid student was rejected.");
    }

    const invalidAnnouncement = new Announcement({
      title: "Invalid course notice",
      body: "This notice has no course reference.",
      scope: "course",
      author: faculty._id,
    });

    try {
      await invalidAnnouncement.validate();
      throw new Error(
        "Expected announcement without course to fail validation.",
      );
    } catch (error) {
      if (error.name !== "ValidationError") throw error;
      console.log("PASS: announcement without course was rejected.");
    }

    console.log("Model validation checks completed.");
  } finally {
    await mongoose.disconnect();
  }
}

checkModels().catch((error) => {
  console.error("Model check failed:", error);
  process.exitCode = 1;
});
