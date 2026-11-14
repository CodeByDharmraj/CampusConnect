const mongoose = require('mongoose')

const Announcement = require('../models/Announcement')
const AnnouncementRead = require('../models/AnnouncementRead')
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

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(
      400,
      `A valid ${fieldName} ID is required.`,
      'VALIDATION_ERROR',
    )
  }
}

async function getFacultyDepartmentIds(facultyId) {
  const assignments = await FacultyCourse.find({
    facultyId,
    isActive: true,
  }).select('courseOfferingId')

  const offeringIds = assignments.map((item) => item.courseOfferingId)

  if (offeringIds.length === 0) return []

  const offerings = await CourseOffering.find({
    _id: { $in: offeringIds },
    isActive: true,
  }).select('courseId')

  const courseIds = offerings.map((item) => item.courseId)

  if (courseIds.length === 0) return []

  const courses = await Course.find({
    _id: { $in: courseIds },
    isActive: true,
  }).select('departmentId')

  return [
    ...new Set(
      courses.map((course) => course.departmentId?.toString()).filter(Boolean),
    ),
  ]
}

async function getVisibleAnnouncementFilters(user) {
  requireAuthenticatedUser(user)

  if (user.role === 'admin') {
    return null
  }

  const filters = [{ scope: 'institution' }]

  if (user.role === 'student' || user.role === 'coordinator') {
    if (user.departmentId) {
      filters.push({
        scope: 'department',
        departmentId: user.departmentId,
      })
    }
  }

  if (user.role === 'student') {
    const enrollments = await Enrollment.find({
      studentId: user._id,
      status: 'enrolled',
    }).select('courseOfferingId')

    const offeringIds = enrollments.map((item) => item.courseOfferingId)

    if (offeringIds.length > 0) {
      filters.push({
        scope: 'course',
        courseOfferingId: { $in: offeringIds },
      })
    }
  }

  if (user.role === 'faculty') {
    const assignments = await FacultyCourse.find({
      facultyId: user._id,
      isActive: true,
    }).select('courseOfferingId')

    const offeringIds = assignments.map((item) => item.courseOfferingId)

    if (offeringIds.length > 0) {
      filters.push({
        scope: 'course',
        courseOfferingId: { $in: offeringIds },
      })
    }

    const departmentIds = await getFacultyDepartmentIds(user._id)

    if (departmentIds.length > 0) {
      filters.push({
        scope: 'department',
        departmentId: { $in: departmentIds },
      })
    }
  }

  return filters
}

async function getAnnouncements(user) {
  const visibleFilters = await getVisibleAnnouncementFilters(user)
  const now = new Date()

  const filter = {
    $and: [
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      },
    ],
  }

  if (visibleFilters !== null) {
    filter.$and.push({ $or: visibleFilters })
  }

  const announcements = await Announcement.find(filter)
    .populate('authorId', 'name email role')
    .populate('departmentId', 'name code')
    .populate({
      path: 'courseOfferingId',
      select: 'academicYear semester section courseId',
      populate: {
        path: 'courseId',
        select: 'name code',
      },
    })
    .sort({ publishedAt: -1 })

  if (user.role !== 'student') {
    return announcements.map((announcement) => ({
      ...announcement.toObject(),
      isRead: null,
      readAt: null,
    }))
  }

  const announcementIds = announcements.map((item) => item._id)

  const reads = await AnnouncementRead.find({
    studentId: user._id,
    announcementId: { $in: announcementIds },
  }).select('announcementId readAt')

  const readMap = new Map(
    reads.map((item) => [item.announcementId.toString(), item.readAt]),
  )

  return announcements.map((announcement) => {
    const readAt = readMap.get(announcement._id.toString()) || null

    return {
      ...announcement.toObject(),
      isRead: Boolean(readAt),
      readAt,
    }
  })
}

async function createAnnouncement(user, input) {
  requireAuthenticatedUser(user)

  let scope
  let departmentId = null
  let courseOfferingId = null

  if (user.role === 'admin') {
    scope = 'institution'
  } else if (user.role === 'coordinator') {
    if (!user.departmentId) {
      throw new ApiError(
        403,
        'A department assignment is required.',
        'DEPARTMENT_REQUIRED',
      )
    }

    scope = 'department'
    departmentId = user.departmentId
  } else if (user.role === 'faculty') {
    validateObjectId(input.courseOfferingId, 'course offering')

    const offering = await CourseOffering.findOne({
      _id: input.courseOfferingId,
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
      throw new ApiError(404, 'Active course not found.', 'COURSE_NOT_FOUND')
    }

    const assignment = await FacultyCourse.exists({
      facultyId: user._id,
      courseOfferingId: offering._id,
      isActive: true,
    })

    if (!assignment) {
      throw new ApiError(
        403,
        'You are not assigned to this course offering.',
        'FACULTY_ASSIGNMENT_REQUIRED',
      )
    }

    scope = 'course'
    courseOfferingId = offering._id
  } else {
    throw new ApiError(
      403,
      'Students cannot publish announcements.',
      'FORBIDDEN',
    )
  }

  const announcement = await Announcement.create({
    title: input.title,
    detail: input.detail,
    category: input.category,
    scope,
    authorId: user._id,
    departmentId,
    courseOfferingId,
    expiresAt: input.expiresAt,
    publishedAt: new Date(),
  })

  return announcement
}

async function markAnnouncementRead(user, announcementId) {
  requireAuthenticatedUser(user)

  if (user.role !== 'student') {
    throw new ApiError(
      403,
      'Only students can mark announcements as read.',
      'FORBIDDEN',
    )
  }

  validateObjectId(announcementId, 'announcement')

  const visibleFilters = await getVisibleAnnouncementFilters(user)

  const announcement = await Announcement.findOne({
    _id: announcementId,
    $and: [
      { $or: visibleFilters },
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    ],
  })

  if (!announcement) {
    throw new ApiError(404, 'Announcement not found.', 'ANNOUNCEMENT_NOT_FOUND')
  }

  const read = await AnnouncementRead.findOneAndUpdate(
    {
      announcementId: announcement._id,
      studentId: user._id,
    },
    {
      $setOnInsert: {
        announcementId: announcement._id,
        studentId: user._id,
        readAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )

  return read
}

async function getAnnouncementOptions(user) {
  requireAuthenticatedUser(user)

  if (user.role !== 'faculty') {
    return { courseOfferings: [] }
  }

  const assignments = await FacultyCourse.find({
    facultyId: user._id,
    isActive: true,
  })
    .populate({
      path: 'courseOfferingId',
      match: { isActive: true },
      select: 'academicYear semester section courseId',
      populate: {
        path: 'courseId',
        select: 'name code',
      },
    })
    .lean()

  const courseOfferings = assignments
    .map((assignment) => assignment.courseOfferingId)
    .filter((offering) => offering?.courseId)

  return { courseOfferings }
}

module.exports = {
  getAnnouncements,
  getAnnouncementOptions,
  createAnnouncement,
  markAnnouncementRead,
}