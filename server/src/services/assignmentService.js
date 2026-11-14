const mongoose = require('mongoose')

const Assignment = require('../models/Assignment')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const ApiError = require('../utils/ApiError')

function requireAuthenticatedUser(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }
}

function requireFaculty(user) {
  requireAuthenticatedUser(user)

  if (user.role !== 'faculty') {
    throw new ApiError(
      403,
      'Only faculty members can manage assignments.',
      'FORBIDDEN',
    )
  }
}

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(
      400,
      `A valid ${fieldName} ID is required.`,
      'VALIDATION_ERROR',
    )
  }
}

async function requireActiveFacultyAssignment(facultyId, offeringId) {
  const assignment = await FacultyCourse.exists({
    facultyId,
    courseOfferingId: offeringId,
    isActive: true,
  })

  if (!assignment) {
    throw new ApiError(
      403,
      'You are not actively assigned to this course offering.',
      'FACULTY_ASSIGNMENT_REQUIRED',
    )
  }
}

/**
 * Returns the course offerings visible to the authenticated user.
 * null means the user has global access.
 */
async function getVisibleOfferingIds(user) {
  requireAuthenticatedUser(user)

  if (user.role === 'admin') {
    return null
  }

  if (user.role === 'faculty') {
    const assignments = await FacultyCourse.find({
      facultyId: user._id,
      isActive: true,
    }).select('courseOfferingId')

    return assignments.map((item) => item.courseOfferingId)
  }

  if (user.role === 'student') {
    const enrollments = await Enrollment.find({
      studentId: user._id,
      status: 'enrolled',
    }).select('courseOfferingId')

    return enrollments.map((item) => item.courseOfferingId)
  }

  if (user.role === 'coordinator') {
    if (!user.departmentId) {
      throw new ApiError(
        403,
        'A valid department assignment is required.',
        'FORBIDDEN',
      )
    }

    const courses = await Course.find({
      departmentId: user.departmentId,
      isActive: true,
    }).select('_id')

    const courseIds = courses.map((course) => course._id)

    const offerings = await CourseOffering.find({
      courseId: { $in: courseIds },
      isActive: true,
    }).select('_id')

    return offerings.map((offering) => offering._id)
  }

  throw new ApiError(403, 'Access denied.', 'FORBIDDEN')
}

function buildVisibilityFilter(user, offeringIds) {
  const filter = {}

  if (offeringIds !== null) {
    filter.courseOfferingId = { $in: offeringIds }
  }

  if (user.role === 'faculty') {
    filter.facultyId = user._id
  }

  if (user.role === 'student') {
    filter.status = 'published'
  }

  return filter
}

async function getAssignments(user) {
  const offeringIds = await getVisibleOfferingIds(user)
  const filter = buildVisibilityFilter(user, offeringIds)

  return Assignment.find(filter)
    .populate({
      path: 'courseOfferingId',
      select: 'academicYear semester section courseId',
      populate: {
        path: 'courseId',
        select: 'name code credits departmentId',
      },
    })
    .populate('facultyId', 'name email')
    .sort({ createdAt: -1 })
}

async function getAssignment(user, assignmentId) {
  validateObjectId(assignmentId, 'assignment')
  const offeringIds = await getVisibleOfferingIds(user)

  const filter = {
    _id: assignmentId,
    ...buildVisibilityFilter(user, offeringIds),
  }

  const assignment = await Assignment.findOne(filter)
    .populate({
      path: 'courseOfferingId',
      select: 'academicYear semester section courseId',
      populate: {
        path: 'courseId',
        select: 'name code credits departmentId',
      },
    })
    .populate('facultyId', 'name email')

  if (!assignment) {
    throw new ApiError(404, 'Assignment not found.', 'ASSIGNMENT_NOT_FOUND')
  }

  return assignment
}

async function createAssignment(user, input) {
  requireFaculty(user)

  validateObjectId(input.courseOfferingId, 'course offering')

  const offering = await CourseOffering.findById(input.courseOfferingId)

  if (!offering || !offering.isActive) {
    throw new ApiError(
      404,
      'Active course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  const course = await Course.findOne({
    _id: offering.courseId,
    isActive: true,
  })

  if (!course) {
    throw new ApiError(
      404,
      'Active parent course not found.',
      'COURSE_NOT_FOUND',
    )
  }

  await requireActiveFacultyAssignment(user._id, offering._id)

  const assignment = new Assignment({
    ...input,
    facultyId: user._id,
    status: 'draft',
    publishedAt: null,
  })

  await assignment.save()

  return assignment
}

async function updateAssignment(user, assignmentId, updates) {
  requireFaculty(user)
  validateObjectId(assignmentId, 'assignment')

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    facultyId: user._id,
    status: 'draft',
  })

  if (!assignment) {
    throw new ApiError(
      404,
      'Editable draft assignment not found.',
      'ASSIGNMENT_NOT_FOUND',
    )
  }

  await requireActiveFacultyAssignment(user._id, assignment.courseOfferingId)

  Object.assign(assignment, updates)

  await assignment.save()

  return assignment
}

async function publishAssignment(user, assignmentId) {
  requireFaculty(user)
  validateObjectId(assignmentId, 'assignment')

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    facultyId: user._id,
    status: 'draft',
  })

  if (!assignment) {
    throw new ApiError(
      404,
      'Publishable draft assignment not found.',
      'ASSIGNMENT_NOT_FOUND',
    )
  }

  await requireActiveFacultyAssignment(user._id, assignment.courseOfferingId)

  if (
    !assignment.dueDate ||
    !Number.isFinite(assignment.dueDate.getTime()) ||
    assignment.dueDate <= new Date()
  ) {
    throw new ApiError(
      400,
      'A future submission deadline is required before publishing.',
      'INVALID_ASSIGNMENT_DEADLINE',
    )
  }

  assignment.status = 'published'
  assignment.publishedAt = new Date()

  await assignment.save()

  return assignment
}

module.exports = {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
}
