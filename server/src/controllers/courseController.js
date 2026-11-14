const asyncHandler = require('../utils/asyncHandler')
const courseService = require('../services/courseService')
const myCoursesService = require('../services/myCoursesService')
const {
  validateCreateCourse,
  validateUpdateCourse,
  validateCourseId,
} = require('../validation/courseValidation')
const { HTTP_STATUS } = require('../constants/httpStatus')

const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await myCoursesService.getMyCourses(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { courses },
  })
})

const createCourse = asyncHandler(async (req, res) => {
  const input = validateCreateCourse(req.body)
  const course = await courseService.createCourse(req.user, input)

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { course },
  })
})

const getCourses = asyncHandler(async (req, res) => {
  const courses = await courseService.getCourses(req.user)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { courses },
  })
})

const getCourseById = asyncHandler(async (req, res) => {
  const courseId = validateCourseId(req.params.courseId)
  const course = await courseService.getCourseById(req.user, courseId)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { course },
  })
})

const updateCourse = asyncHandler(async (req, res) => {
  const courseId = validateCourseId(req.params.courseId)
  const updates = validateUpdateCourse(req.body)
  const course = await courseService.updateCourse(req.user, courseId, updates)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { course },
  })
})

const deactivateCourse = asyncHandler(async (req, res) => {
  const courseId = validateCourseId(req.params.courseId)
  const course = await courseService.deactivateCourse(req.user, courseId)

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { course },
  })
})

module.exports = {
  getMyCourses,
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deactivateCourse,
}
