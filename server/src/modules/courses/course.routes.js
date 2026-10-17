import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import { requireAssignedFaculty } from "../../middleware/authorizeCourse.js";
import { validate } from "../../middleware/validate.js";

import {
  courseIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
  createEnrollmentSchema,
} from "../../schemas/course.schema.js";

import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  listEnrollments,
  createEnrollment,
} from "./course.controller.js";

const router = Router();

// Every course endpoint requires an authenticated user.
router.use(authenticate);

// GET /api/courses
router.get("/", validate(listCoursesQuerySchema, "query"), listCourses);

// GET /api/courses/:courseId
router.get("/:courseId", validate(courseIdParamsSchema, "params"), getCourse);

// POST /api/courses — administrator only
router.post(
  "/",
  authorizeRoles("admin"),
  validate(createCourseSchema, "body"),
  createCourse,
);

// PATCH /api/courses/:courseId
router.patch(
  "/:courseId",
  authorizeRoles("faculty", "admin"),
  validate(courseIdParamsSchema, "params"),
  validate(updateCourseSchema, "body"),
  updateCourse,
);

// GET /api/courses/:courseId/enrollments
router.get(
  "/:courseId/enrollments",
  authorizeRoles("faculty", "admin"),
  validate(courseIdParamsSchema, "params"),
  requireAssignedFaculty,
  listEnrollments,
);

// POST /api/courses/:courseId/enrollments — administrator only
router.post(
  "/:courseId/enrollments",
  authorizeRoles("admin"),
  validate(courseIdParamsSchema, "params"),
  validate(createEnrollmentSchema, "body"),
  createEnrollment,
);

export default router;
