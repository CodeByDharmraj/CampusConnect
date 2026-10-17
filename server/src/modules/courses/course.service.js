import mongoose from "mongoose";

import User from "../../models/User.js";
import Course from "../../models/Course.js";
import CourseEnrollment from "../../models/CourseEnrollment.js";
import { ApiError } from "../../utils/ApiError.js";

function toCourseDTO(course) {
  const faculty = course.faculty;

  return {
    id: String(course._id),
    code: course.code,
    title: course.title,
    description: course.description ?? "",
    faculty: faculty?._id
      ? {
          id: String(faculty._id),
          name: faculty.name,
          email: faculty.email,
        }
      : String(faculty),
    department: course.department,
    semester: course.semester,
    isActive: course.isActive,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureFaculty(facultyId) {
  const faculty = await User.findOne({
    _id: facultyId,
    role: "faculty",
    isActive: true,
  });

  if (!faculty) {
    throw new ApiError(
      400,
      "INVALID_FACULTY",
      "The assigned faculty account is not valid or active.",
    );
  }

  return faculty;
}

export async function listCourses(user, filters) {
  const query = {};

  if (user.role !== "admin") {
    query.isActive = true;
  }

  if (user.role === "faculty") {
    query.faculty = user._id;
  }

  if (user.role === "student") {
    const enrollments = await CourseEnrollment.find({
      student: user._id,
      status: "active",
    }).select("course");

    const courseIds = enrollments.map((item) => item.course);

    if (courseIds.length === 0) {
      return [];
    }

    query._id = { $in: courseIds };
  }

  if (filters.semester !== undefined) {
    query.semester = filters.semester;
  }

  if (filters.department) {
    query.department = filters.department;
  }

  if (filters.search) {
    const pattern = new RegExp(escapeRegex(filters.search), "i");

    query.$or = [{ code: pattern }, { title: pattern }];
  }

  const courses = await Course.find(query)
    .populate("faculty", "name email")
    .sort({ code: 1 });

  return courses.map(toCourseDTO);
}

export async function getCourseById(courseId, user) {
  const course = await Course.findById(courseId).populate(
    "faculty",
    "name email",
  );

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  if (user.role === "admin") {
    return toCourseDTO(course);
  }

  if (!course.isActive) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  if (
    user.role === "faculty" &&
    String(course.faculty._id) === String(user._id)
  ) {
    return toCourseDTO(course);
  }

  if (user.role === "student") {
    const enrolled = await CourseEnrollment.exists({
      student: user._id,
      course: course._id,
      status: "active",
    });

    if (enrolled) {
      return toCourseDTO(course);
    }
  }

  // Do not reveal the details of a course the user cannot access.
  throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
}

export async function createCourse(data) {
  await ensureFaculty(data.faculty);

  const course = await Course.create(data);
  await course.populate("faculty", "name email");

  return toCourseDTO(course);
}

export async function updateCourse(courseId, data, user) {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  if (user.role === "faculty" && String(course.faculty) !== String(user._id)) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_DENIED",
      "You cannot manage this course.",
    );
  }

  if (user.role === "faculty") {
    const allowedFields = new Set(["title", "description"]);
    const forbiddenFields = Object.keys(data).filter(
      (key) => !allowedFields.has(key),
    );

    if (forbiddenFields.length > 0) {
      throw new ApiError(
        403,
        "COURSE_UPDATE_FORBIDDEN",
        "Faculty may update only the course title and description.",
      );
    }
  }

  if (data.faculty !== undefined) {
    await ensureFaculty(data.faculty);
  }

  Object.assign(course, data);
  await course.save();
  await course.populate("faculty", "name email");

  return toCourseDTO(course);
}

export async function listCourseEnrollments(courseId) {
  const enrollments = await CourseEnrollment.find({
    course: courseId,
    status: "active",
  })
    .populate("student", "name email studentId semester")
    .sort({ createdAt: 1 });

  return enrollments.map((enrollment) => ({
    id: String(enrollment._id),
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    student: {
      id: String(enrollment.student._id),
      name: enrollment.student.name,
      email: enrollment.student.email,
      studentId: enrollment.student.studentId,
      semester: enrollment.student.semester,
    },
  }));
}

export async function enrollStudent(courseId, studentId) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw new ApiError(400, "INVALID_COURSE_ID", "Invalid course ID.");
  }

  const course = await Course.findById(courseId);

  if (!course || !course.isActive) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const student = await User.findOne({
    _id: studentId,
    role: "student",
    isActive: true,
  });

  if (!student) {
    throw new ApiError(
      400,
      "INVALID_STUDENT",
      "The student account is not valid or active.",
    );
  }

  const enrollment = await CourseEnrollment.create({
    student: student._id,
    course: course._id,
    status: "active",
  });

  return {
    id: String(enrollment._id),
    student: String(enrollment.student),
    course: String(enrollment.course),
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
  };
}
