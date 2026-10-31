const mongoose = require('mongoose')

const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Department = require('../models/Department')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const ApiError = require('../utils/ApiError')

const MANAGER_ROLES = ['coordinator', 'admin']
const VIEWER_ROLES = ['student', 'faculty', 'coordinator', 'admin']

const UPDATABLE_FIELDS = ['name', 'code', 'description', 'credits']

const CREATABLE_FIELDS = [
  'name',
  'code',
  'description',
  'credits',
  'departmentId',
]

function requireAuthenticatedUser(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (!VIEWER_ROLES.includes(user.role)) {
    throw new ApiError(403, 'Access denied.', 'FORBIDDEN')
  }
}

function requireManager(user) {
  requireAuthenticatedUser(user)

  if (!MANAGER_ROLES.includes(user.role)) {
    throw new ApiError(
      403,
      'You do not have permission to manage courses.',
      'FORBIDDEN',
    )
  }
}

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(
      400,
      `A valid ${fieldName} is required.`,
      'VALIDATION_ERROR',
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

function handleDuplicateCourseCode(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'A course with this code already exists in the department.',
      'COURSE_CODE_ALREADY_EXISTS',
    )
  }

  throw error
}

async function findRelatedCourseIds(user) {
  let offeringIds

  if (user.role === 'student') {
    // Include every enrollment status to preserve historical visibility.
    offeringIds = await Enrollment.distinct('courseOfferingId', {
      studentId: user._id,
    })
  } else if (user.role === 'faculty') {
    // Include inactive assignments so previously taught courses remain visible.
    offeringIds = await FacultyCourse.distinct('courseOfferingId', {
      facultyId: user._id,
    })
  } else {
    throw new ApiError(403, 'Access denied.', 'FORBIDDEN')
  }

  if (offeringIds.length === 0) {
    return []
  }

  return CourseOffering.distinct('courseId', {
    _id: { $in: offeringIds },
  })
}

async function findAuthorizedCourse(user, courseId) {
  validateObjectId(courseId, 'course ID')

  if (user.role === 'admin') {
    return Course.findOne({ _id: courseId })
  }

  if (user.role === 'coordinator') {
    const departmentId = getCoordinatorDepartmentId(user)

    return Course.findOne({
      _id: courseId,
      departmentId,
    })
  }

  const offeringIds = await (user.role === 'student'
    ? Enrollment.distinct('courseOfferingId', {
        studentId: user._id,
      })
    : FacultyCourse.distinct('courseOfferingId', {
        facultyId: user._id,
      }))

  if (offeringIds.length === 0) {
    return null
  }

  const offering = await CourseOffering.exists({
    _id: { $in: offeringIds },
    courseId,
  })

  if (!offering) {
    return null
  }

  return Course.findOne({ _id: courseId })
}

async function createCourse(user, input) {
  requireManager(user)

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(
      400,
      'Course details must be provided.',
      'VALIDATION_ERROR',
    )
  }

  const unexpectedFields = Object.keys(input).filter(
    (field) => !CREATABLE_FIELDS.includes(field),
  )

  if (unexpectedFields.length > 0) {
    throw new ApiError(
      400,
      `Unexpected course field(s): ${unexpectedFields.join(', ')}.`,
      'VALIDATION_ERROR',
    )
  }

  const { name, code, description = '', credits } = input
  let { departmentId } = input

  if (user.role === 'coordinator') {
    const assignedDepartmentId = getCoordinatorDepartmentId(user)

    if (
      departmentId &&
      departmentId.toString() !== assignedDepartmentId.toString()
    ) {
      throw new ApiError(
        403,
        'You cannot create courses in another department.',
        'FORBIDDEN',
      )
    }

    departmentId = assignedDepartmentId
  }

  validateObjectId(departmentId, 'department ID')

  const department = await Department.findOne({
    _id: departmentId,
    isActive: true,
  })

  if (!department) {
    throw new ApiError(
      400,
      'The selected department does not exist or is inactive.',
      'INVALID_DEPARTMENT',
    )
  }

  const course = new Course({
    name,
    code,
    description,
    credits,
    departmentId,
    isActive: true,
  })

  try {
    await course.save()
    return course
  } catch (error) {
    handleDuplicateCourseCode(error)
  }
}

async function getCourses(user) {
  requireAuthenticatedUser(user)

  if (user.role === 'admin') {
    return Course.find({})
  }

  if (user.role === 'coordinator') {
    const departmentId = getCoordinatorDepartmentId(user)

    return Course.find({ departmentId })
  }

  const courseIds = await findRelatedCourseIds(user)

  if (courseIds.length === 0) {
    return []
  }

  // Deliberately do not filter isActive: historical courses remain visible.
  return Course.find({
    _id: { $in: courseIds },
  })
}

async function getCourseById(user, courseId) {
  requireAuthenticatedUser(user)

  const course = await findAuthorizedCourse(user, courseId)

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'COURSE_NOT_FOUND')
  }

  return course
}

async function updateCourse(user, courseId, updates) {
  requireManager(user)
  validateObjectId(courseId, 'course ID')

  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new ApiError(
      400,
      'Course updates must be provided.',
      'VALIDATION_ERROR',
    )
  }

  const fields = Object.keys(updates)

  if (
    fields.length === 0 ||
    fields.some((field) => !UPDATABLE_FIELDS.includes(field))
  ) {
    throw new ApiError(
      400,
      'Only name, code, description and credits can be updated.',
      'VALIDATION_ERROR',
    )
  }

  const course = await findAuthorizedCourse(user, courseId)

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'COURSE_NOT_FOUND')
  }

  for (const field of fields) {
    course[field] = updates[field]
  }

  try {
    await course.save()
    return course
  } catch (error) {
    handleDuplicateCourseCode(error)
  }
}

async function deactivateCourse(user, courseId) {
  requireManager(user)
  validateObjectId(courseId, 'course ID')

  const course = await findAuthorizedCourse(user, courseId)

  if (!course) {
    throw new ApiError(404, 'Course not found.', 'COURSE_NOT_FOUND')
  }

  // Make deactivation idempotent.
  if (!course.isActive) {
    return course
  }

  course.isActive = false
  await course.save()

  return course
}

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deactivateCourse,
}
