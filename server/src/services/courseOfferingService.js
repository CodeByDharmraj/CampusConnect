const mongoose = require('mongoose')

const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const ApiError = require('../utils/ApiError')

const MANAGER_ROLES = ['admin', 'coordinator']

function requireManager(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (!MANAGER_ROLES.includes(user.role)) {
    throw new ApiError(
      403,
      'You do not have permission to manage course offerings.',
      'FORBIDDEN',
    )
  }
}

function getCoordinatorDepartmentId(user) {
  if (!user.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(
      403,
      'A valid department assignment is required.',
      'FORBIDDEN',
    )
  }

  return user.departmentId
}

function validateCourseId(courseId) {
  if (!mongoose.isValidObjectId(courseId)) {
    throw new ApiError(
      400,
      'A valid course ID is required.',
      'VALIDATION_ERROR',
    )
  }
}

function handleDuplicateOffering(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'This course offering already exists for the academic year, semester and section.',
      'COURSE_OFFERING_ALREADY_EXISTS',
    )
  }

  throw error
}

async function createCourseOffering(user, input) {
  requireManager(user)

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(
      400,
      'Course offering details must be provided.',
      'VALIDATION_ERROR',
    )
  }

  const allowedFields = ['courseId', 'academicYear', 'semester', 'section']

  const unexpectedFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  )

  if (
    unexpectedFields.length > 0 ||
    allowedFields.some((field) => !Object.hasOwn(input, field))
  ) {
    throw new ApiError(
      400,
      'Provide only courseId, academicYear, semester and section.',
      'VALIDATION_ERROR',
    )
  }

  const { courseId, academicYear, semester, section } = input

  validateCourseId(courseId)

  let course

  if (user.role === 'coordinator') {
    const departmentId = getCoordinatorDepartmentId(user)

    course = await Course.findOne({
      _id: courseId,
      departmentId,
    })
  } else {
    course = await Course.findById(courseId)
  }

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'COURSE_NOT_FOUND')
  }

  if (!course.isActive) {
    throw new ApiError(
      409,
      'An offering cannot be created for an inactive course.',
      'PARENT_COURSE_INACTIVE',
    )
  }

  const offering = new CourseOffering({
    courseId: course._id,
    academicYear,
    semester,
    section,
    isActive: true,
  })

  try {
    await offering.save()
    return offering
  } catch (error) {
    handleDuplicateOffering(error)
  }
}

module.exports = {
  createCourseOffering,
}
