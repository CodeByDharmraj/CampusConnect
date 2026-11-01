const mongoose = require('mongoose')

const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const ApiError = require('../utils/ApiError')

function requireAdministrator(user) {
  if (!user || !user._id || user.role !== 'admin') {
    throw new ApiError(
      user?._id ? 403 : 401,
      user?._id
        ? 'Only administrators can manage student enrollments.'
        : 'Authentication is required.',
      user?._id ? 'FORBIDDEN' : 'AUTHENTICATION_REQUIRED',
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

function handleDuplicateEnrollment(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'An enrollment record already exists for this student and course offering.',
      'ENROLLMENT_ALREADY_EXISTS',
    )
  }

  throw error
}

// Returns the active students and active offerings available to the admin.
async function getEnrollmentOptions(user) {
  requireAdministrator(user)

  const [students, offerings] = await Promise.all([
    User.find({ role: 'student', isActive: true })
      .select('name email departmentId')
      .sort({ name: 1 })
      .limit(500)
      .lean(),

    CourseOffering.find({ isActive: true })
      .populate({
        path: 'courseId',
        match: { isActive: true },
        select: 'name code credits departmentId',
      })
      .sort({ academicYear: -1, semester: 1, section: 1 })
      .limit(500)
      .lean(),
  ])

  return {
    students,
    offerings: offerings.filter((offering) => offering.courseId),
  }
}

// Lists enrollment history for one offering.
async function getOfferingEnrollments(user, offeringId) {
  requireAdministrator(user)
  validateObjectId(offeringId, 'course offering ID')

  const offering = await CourseOffering.findById(offeringId)
    .populate('courseId', 'name code credits departmentId')
    .lean()

  if (!offering) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  const enrollments = await Enrollment.find({
    courseOfferingId: offeringId,
  })
    .populate('studentId', 'name email isActive')
    .sort({ createdAt: -1 })
    .lean()

  return { offering, enrollments }
}

async function createEnrollment(user, input) {
  requireAdministrator(user)

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(
      400,
      'Enrollment details must be provided.',
      'VALIDATION_ERROR',
    )
  }

  const allowedFields = ['studentId', 'courseOfferingId']
  const unexpectedFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  )

  if (
    unexpectedFields.length > 0 ||
    Object.keys(input).length !== allowedFields.length
  ) {
    throw new ApiError(
      400,
      'Provide only studentId and courseOfferingId.',
      'VALIDATION_ERROR',
    )
  }

  const { studentId, courseOfferingId } = input

  validateObjectId(studentId, 'student ID')
  validateObjectId(courseOfferingId, 'course offering ID')

  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    isActive: true,
  })

  if (!student) {
    throw new ApiError(
      404,
      'Active student account not found.',
      'STUDENT_NOT_FOUND',
    )
  }

  const offering = await CourseOffering.findOne({
    _id: courseOfferingId,
    isActive: true,
  })

  if (!offering) {
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
      409,
      'The parent course is inactive.',
      'PARENT_COURSE_INACTIVE',
    )
  }

  const existing = await Enrollment.findOne({
    studentId,
    courseOfferingId,
  })

  if (existing) {
    if (existing.status === 'enrolled') {
      throw new ApiError(
        409,
        'This student is already enrolled in the course offering.',
        'STUDENT_ALREADY_ENROLLED',
      )
    }

    if (existing.status === 'completed') {
      throw new ApiError(
        409,
        'A completed enrollment cannot be reopened.',
        'ENROLLMENT_ALREADY_COMPLETED',
      )
    }

    // Reuse the withdrawn record instead of violating the permanent
    // unique compound index or losing the enrollment history.
    const reactivated = await Enrollment.findOneAndUpdate(
      {
        _id: existing._id,
        status: 'withdrawn',
      },
      { $set: { status: 'enrolled' } },
      { new: true, runValidators: true },
    )

    if (!reactivated) {
      throw new ApiError(
        409,
        'The enrollment changed while it was being reactivated. Refresh and try again.',
        'ENROLLMENT_STATE_CHANGED',
      )
    }

    return reactivated
  }

  try {
    const enrollment = new Enrollment({
      studentId,
      courseOfferingId,
      status: 'enrolled',
    })

    await enrollment.save()
    return enrollment
  } catch (error) {
    handleDuplicateEnrollment(error)
  }
}

async function withdrawEnrollment(user, enrollmentId) {
  requireAdministrator(user)
  validateObjectId(enrollmentId, 'enrollment ID')

  const enrollment = await Enrollment.findOneAndUpdate(
    {
      _id: enrollmentId,
      status: 'enrolled',
    },
    { $set: { status: 'withdrawn' } },
    { new: true, runValidators: true },
  )

  if (!enrollment) {
    const existing = await Enrollment.findById(enrollmentId)

    if (!existing) {
      throw new ApiError(404, 'Enrollment not found.', 'ENROLLMENT_NOT_FOUND')
    }

    throw new ApiError(
      409,
      'Only an active enrollment can be withdrawn.',
      'ENROLLMENT_NOT_ACTIVE',
    )
  }

  return enrollment
}

module.exports = {
  getEnrollmentOptions,
  getOfferingEnrollments,
  createEnrollment,
  withdrawEnrollment,
}
