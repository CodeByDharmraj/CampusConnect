const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const courseController = require('../controllers/courseController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

// Every course endpoint requires an authenticated, active user.
router.use(authenticate)

// Return only the authenticated student's or faculty member's
// current course offerings.
router.get(
  '/my',
  authorizeRoles(ROLES.STUDENT, ROLES.FACULTY),
  courseController.getMyCourses,
)

// Create a course. Coordinators are restricted to their own department
// by the Course Service; administrators can select any active department.
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseController.createCourse,
)

// List courses visible to the authenticated user.
// The service applies role-specific department and relationship scope.
router.get('/', courseController.getCourses)

// Get one course. The service checks the user's relationship to the course.
router.get('/:courseId', courseController.getCourseById)

// Update permitted course fields.
router.patch(
  '/:courseId',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseController.updateCourse,
)

// Deactivate rather than delete, preserving academic history.
router.patch(
  '/:courseId/deactivate',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseController.deactivateCourse,
)

module.exports = router
