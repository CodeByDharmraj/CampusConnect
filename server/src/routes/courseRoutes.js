const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')
const courseService = require('../services/courseService')
const asyncHandler = require('../utils/asyncHandler')

const {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseId,
} = require('../validation/courseValidation')

const router = express.Router()

// Every course endpoint requires an authenticated, active user.
router.use(authenticate)

// Create a course. Coordinators are restricted to their own department
// by the Course Service; administrators can select any active department.
router.post(
  '/',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const input = validateCreateCourse(req.body)
    const course = await courseService.createCourse(req.user, input)

    return res.status(201).json({
      success: true,
      data: { course },
    })
  }),
)

// List courses visible to the authenticated user.
// The service applies role-specific department and relationship scope.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const courses = await courseService.getCourses(req.user)

    return res.status(200).json({
      success: true,
      data: { courses },
    })
  }),
)

// Get one course. The service checks the user's relationship to the course.
router.get(
  '/:courseId',
  asyncHandler(async (req, res) => {
    const courseId = validateCourseId(req.params.courseId)
    const course = await courseService.getCourseById(req.user, courseId)

    return res.status(200).json({
      success: true,
      data: { course },
    })
  }),
)

// Update permitted course fields.
router.patch(
  '/:courseId',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const courseId = validateCourseId(req.params.courseId)
    const updates = validateUpdateCourse(req.body)
    const course = await courseService.updateCourse(req.user, courseId, updates)

    return res.status(200).json({
      success: true,
      data: { course },
    })
  }),
)

// Deactivate rather than delete, preserving academic history.
router.patch(
  '/:courseId/deactivate',
  authorizeRoles('admin', 'coordinator'),
  asyncHandler(async (req, res) => {
    const courseId = validateCourseId(req.params.courseId)
    const course = await courseService.deactivateCourse(req.user, courseId)

    return res.status(200).json({
      success: true,
      data: { course },
    })
  }),
)

module.exports = router
