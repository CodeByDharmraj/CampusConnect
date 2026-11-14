const mongoose = require('mongoose')

const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const FacultyCourse = require('../models/FacultyCourse')
const ApiError = require('../utils/ApiError')

const MANAGER_ROLES = ['admin', 'coordinator']
const VIEWER_ROLES = ['admin', 'coordinator', 'faculty']

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
      'You do not have permission to manage faculty assignments.',
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

function handleDuplicateAssignment(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'This faculty member is already assigned to the course offering.',
      'FACULTY_ASSIGNMENT_ALREADY_EXISTS',
    )
  }

  throw error
}

/**
 * Loads an offering only when the caller is allowed to access its parent
 * course. Returning the same 404 for missing and out-of-scope resources
 * avoids revealing whether another department owns an offering.
 */
async function findAuthorizedOffering(user, offeringId) {
  // Validate coordinator scope before performing database operations.
  const coordinatorDepartmentId =
    user.role === 'coordinator' ? getCoordinatorDepartmentId(user) : null

  const offering = await CourseOffering.findById(offeringId)

  if (!offering) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  let course

  if (user.role === 'admin') {
    course = await Course.findById(offering.courseId)
  } else if (user.role === 'coordinator') {
    course = await Course.findOne({
      _id: offering.courseId,
      departmentId: coordinatorDepartmentId,
    })
  } else if (user.role === 'faculty') {
    course = await Course.findById(offering.courseId)

    if (course) {
      const assignment = await FacultyCourse.exists({
        facultyId: user._id,
        courseOfferingId: offering._id,
        isActive: true,
      })

      if (!assignment) {
        course = null
      }
    }
  }

  if (!course) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  return { offering, course }
}

async function getFacultyAssignmentOptions(user) {
  requireManager(user)

  const courseFilter = {}

  if (user.role === 'coordinator') {
    courseFilter.departmentId = getCoordinatorDepartmentId(user)
  }

  const [offerings, faculty] = await Promise.all([
    CourseOffering.find({ isActive: true })
      .populate({
        path: 'courseId',
        match: {
          ...courseFilter,
          isActive: true,
        },
        select: 'name code credits departmentId',
      })
      .sort({ academicYear: -1, semester: 1, section: 1 })
      .limit(500)
      .lean(),

    User.find({
      role: 'faculty',
      isActive: true,
    })
      .select('name email')
      .sort({ name: 1 })
      .limit(500)
      .lean(),
  ])

  return {
    offerings: offerings.filter((offering) => offering.courseId),
    faculty,
  }
}

async function createFacultyAssignment(user, offeringId, facultyId) {
  requireManager(user)
  validateObjectId(offeringId, 'course offering ID')
  validateObjectId(facultyId, 'faculty ID')

  const { offering, course } = await findAuthorizedOffering(user, offeringId)

  if (!offering.isActive) {
    throw new ApiError(
      409,
      'Faculty cannot be assigned to an inactive course offering.',
      'COURSE_OFFERING_INACTIVE',
    )
  }

  if (!course.isActive) {
    throw new ApiError(
      409,
      'Faculty cannot be assigned to an offering with an inactive parent course.',
      'PARENT_COURSE_INACTIVE',
    )
  }

  const faculty = await User.findOne({
    _id: facultyId,
    role: 'faculty',
    isActive: true,
  })

  if (!faculty) {
    throw new ApiError(
      404,
      'Active faculty account not found.',
      'FACULTY_NOT_FOUND',
    )
  }

  const existingAssignment = await FacultyCourse.findOne({
    facultyId,
    courseOfferingId: offering._id,
    isActive: true,
  })

  if (existingAssignment) {
    throw new ApiError(
      409,
      'This faculty member is already assigned to the course offering.',
      'FACULTY_ASSIGNMENT_ALREADY_EXISTS',
    )
  }

  const assignment = new FacultyCourse({
    facultyId,
    courseOfferingId: offering._id,
    isActive: true,
  })

  try {
    await assignment.save()
    return assignment
  } catch (error) {
    handleDuplicateAssignment(error)
  }
}

async function getFacultyAssignments(user, offeringId) {
  requireAuthenticatedUser(user)
  validateObjectId(offeringId, 'course offering ID')

  await findAuthorizedOffering(user, offeringId)

  const filter = {
    courseOfferingId: offeringId,
  }

  // Faculty can only see their own active assignment.
  // Administrators and coordinators can see the full assignment history.
  if (user.role === 'faculty') {
    filter.facultyId = user._id
    filter.isActive = true
  }

  return FacultyCourse.find(filter)
    .populate('facultyId', 'name email role isActive')
    .sort({ createdAt: -1 })
}

async function deactivateFacultyAssignment(user, offeringId, facultyId) {
  requireManager(user)
  validateObjectId(offeringId, 'course offering ID')
  validateObjectId(facultyId, 'faculty ID')

  const { offering } = await findAuthorizedOffering(user, offeringId)

  const assignment = await FacultyCourse.findOne({
    facultyId,
    courseOfferingId: offering._id,
    isActive: true,
  })

  if (!assignment) {
    throw new ApiError(
      404,
      'Active faculty assignment not found.',
      'FACULTY_ASSIGNMENT_NOT_FOUND',
    )
  }

  assignment.isActive = false
  await assignment.save()

  return assignment
}

module.exports = {
  getFacultyAssignmentOptions,
  createFacultyAssignment,
  getFacultyAssignments,
  deactivateFacultyAssignment,
}
