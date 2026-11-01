const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const ApiError = require('../utils/ApiError')

function requireStudentOrFaculty(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (!['student', 'faculty'].includes(user.role)) {
    throw new ApiError(
      403,
      'Only students and faculty can access My Courses.',
      'FORBIDDEN',
    )
  }
}

const offeringPopulation = {
  path: 'courseOfferingId',
  match: { isActive: true },
  select: 'courseId academicYear semester section isActive',
  populate: {
    path: 'courseId',
    match: { isActive: true },
    select: 'name code description credits departmentId isActive',
  },
}

async function getMyCourses(user) {
  requireStudentOrFaculty(user)

  if (user.role === 'student') {
    const enrollments = await Enrollment.find({
      studentId: user._id,
      status: 'enrolled',
    })
      .populate(offeringPopulation)
      .sort({ createdAt: -1 })
      .lean()

    return enrollments
      .filter((enrollment) => enrollment.courseOfferingId?.courseId)
      .map((enrollment) => ({
        id: enrollment._id,
        relationshipStatus: enrollment.status,
        courseOffering: enrollment.courseOfferingId,
      }))
  }

  const assignments = await FacultyCourse.find({
    facultyId: user._id,
    isActive: true,
  })
    .populate(offeringPopulation)
    .sort({ createdAt: -1 })
    .lean()

  return assignments
    .filter((assignment) => assignment.courseOfferingId?.courseId)
    .map((assignment) => ({
      id: assignment._id,
      relationshipStatus: 'assigned',
      courseOffering: assignment.courseOfferingId,
    }))
}

module.exports = {
  getMyCourses,
}
