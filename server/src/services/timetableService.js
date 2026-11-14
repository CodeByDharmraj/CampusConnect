const mongoose = require('mongoose')

const User = require('../models/User')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const TimetableEntry = require('../models/TimetableEntry')
const ApiError = require('../utils/ApiError')

const {
  validateCreateTimetableEntry,
  validateUpdateTimetableEntry,
  validateTimetableEntryId,
} = require('../validation/timetableValidation')

const MANAGER_ROLES = ['admin', 'coordinator']
const VIEWER_ROLES = ['admin', 'coordinator', 'faculty', 'student']

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
      'You do not have permission to manage timetable entries.',
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

/**
 * Finds an offering and its parent course.
 *
 * Coordinators can access only offerings belonging to their department.
 * Missing and out-of-department offerings return the same 404 response.
 */
async function findAuthorizedOffering(user, offeringId) {
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

  const courseFilter = {
    _id: offering.courseId,
  }

  if (user.role === 'coordinator') {
    courseFilter.departmentId = coordinatorDepartmentId
  }

  const course = await Course.findOne(courseFilter)

  if (!course) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  return { offering, course }
}

/**
 * Requires an active offering and active parent course.
 */
async function requireActiveOffering(user, offeringId) {
  const { offering, course } = await findAuthorizedOffering(user, offeringId)

  if (!offering.isActive) {
    throw new ApiError(
      409,
      'Timetable entries cannot be created for an inactive course offering.',
      'COURSE_OFFERING_INACTIVE',
    )
  }

  if (!course.isActive) {
    throw new ApiError(
      409,
      'Timetable entries cannot be created for an inactive parent course.',
      'PARENT_COURSE_INACTIVE',
    )
  }

  return { offering, course }
}

/**
 * Ensures that the selected faculty account is active and
 * has an active assignment to the selected course offering.
 */
async function requireActiveFacultyAssignment(facultyId, offeringId) {
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

  const assignment = await FacultyCourse.findOne({
    facultyId,
    courseOfferingId: offeringId,
    isActive: true,
  })

  if (!assignment) {
    throw new ApiError(
      409,
      'The faculty member is not actively assigned to this course offering.',
      'FACULTY_ASSIGNMENT_REQUIRED',
    )
  }

  return faculty
}

/**
 * Checks overlapping active sessions for:
 * 1. The same faculty member.
 * 2. The same room.
 * 3. The same course offering.
 *
 * Overlap condition:
 * newStart < existingEnd && newEnd > existingStart
 *
 * Back-to-back sessions are allowed.
 */
async function checkScheduleConflicts(input, excludeEntryId = null) {
  const baseFilter = {
    dayOfWeek: input.dayOfWeek,
    isActive: true,
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime },
  }

  if (excludeEntryId) {
    baseFilter._id = { $ne: excludeEntryId }
  }

  const conflictChecks = [
    {
      field: 'facultyId',
      value: input.facultyId,
      message: 'This faculty member already has a session during this time.',
      code: 'FACULTY_SCHEDULE_CONFLICT',
    },
    {
      field: 'room',
      value: input.room,
      message: 'This room is already booked during this time.',
      code: 'ROOM_SCHEDULE_CONFLICT',
    },
    {
      field: 'courseOfferingId',
      value: input.courseOfferingId,
      message: 'This course offering already has a session during this time.',
      code: 'COURSE_SCHEDULE_CONFLICT',
    },
  ]

  for (const conflict of conflictChecks) {
    const existingEntry = await TimetableEntry.findOne({
      ...baseFilter,
      [conflict.field]: conflict.value,
    })

    if (existingEntry) {
      throw new ApiError(409, conflict.message, conflict.code)
    }
  }
}

/**
 * Returns active course offering IDs visible to a user.
 *
 * Admin receives null, which means no offering restriction.
 */
async function getVisibleOfferingIds(user) {
  if (user.role === 'admin') {
    return null
  }

  if (user.role === 'coordinator') {
    const departmentId = getCoordinatorDepartmentId(user)

    const courses = await Course.find({
      departmentId,
      isActive: true,
    })
      .select('_id')
      .lean()

    const courseIds = courses.map((course) => course._id)

    if (courseIds.length === 0) {
      return []
    }

    const offerings = await CourseOffering.find({
      courseId: { $in: courseIds },
      isActive: true,
    })
      .select('_id')
      .lean()

    return offerings.map((offering) => offering._id)
  }

  if (user.role === 'faculty') {
    const assignments = await FacultyCourse.find({
      facultyId: user._id,
      isActive: true,
    })
      .select('courseOfferingId')
      .lean()

    const offeringIds = assignments.map(
      (assignment) => assignment.courseOfferingId,
    )

    return getActiveOfferingIds(offeringIds)
  }

  const enrollments = await Enrollment.find({
    studentId: user._id,
    status: 'enrolled',
  })
    .select('courseOfferingId')
    .lean()

  const offeringIds = enrollments.map(
    (enrollment) => enrollment.courseOfferingId,
  )

  return getActiveOfferingIds(offeringIds)
}

/**
 * Removes inactive offerings and offerings whose parent courses
 * are inactive.
 */
async function getActiveOfferingIds(offeringIds) {
  if (offeringIds.length === 0) {
    return []
  }

  const offerings = await CourseOffering.find({
    _id: { $in: offeringIds },
    isActive: true,
  })
    .select('_id courseId')
    .lean()

  if (offerings.length === 0) {
    return []
  }

  const courseIds = offerings.map((offering) => offering.courseId)

  const activeCourses = await Course.find({
    _id: { $in: courseIds },
    isActive: true,
  })
    .select('_id')
    .lean()

  const activeCourseIds = new Set(
    activeCourses.map((course) => String(course._id)),
  )

  return offerings
    .filter((offering) => activeCourseIds.has(String(offering.courseId)))
    .map((offering) => offering._id)
}

/**
 * Retrieves all active timetable entries visible to the user.
 */
async function getTimetableEntries(user) {
  requireAuthenticatedUser(user)

  const offeringIds = await getVisibleOfferingIds(user)

  // Avoid unnecessary database queries for empty authorization scopes.
  if (offeringIds !== null && offeringIds.length === 0) {
    return []
  }

  const filter = {
    isActive: true,
  }

  if (offeringIds !== null) {
    filter.courseOfferingId = {
      $in: offeringIds,
    }
  }

  return TimetableEntry.find(filter)
    .populate({
      path: 'courseOfferingId',
      select: 'courseId academicYear semester section',
      populate: {
        path: 'courseId',
        select: 'name code credits departmentId',
      },
    })
    .populate('facultyId', 'name email')
    .sort({
      dayOfWeek: 1,
      startTime: 1,
    })
    .lean()
}

/**
 * Retrieves one active timetable entry.
 *
 * Non-admin users are restricted at query level to their authorized
 * course offerings. Out-of-scope entries return the same 404 as missing
 * entries to avoid revealing resource existence.
 */
async function getTimetableEntry(user, entryId) {
  requireAuthenticatedUser(user)
  validateTimetableEntryId(entryId)

  const offeringIds = await getVisibleOfferingIds(user)

  if (offeringIds !== null && offeringIds.length === 0) {
    throw new ApiError(
      404,
      'Timetable entry not found.',
      'TIMETABLE_ENTRY_NOT_FOUND',
    )
  }

  const filter = {
    _id: entryId,
    isActive: true,
  }

  if (offeringIds !== null) {
    filter.courseOfferingId = {
      $in: offeringIds,
    }
  }

  const entry = await TimetableEntry.findOne(filter)
    .populate({
      path: 'courseOfferingId',
      select: 'courseId academicYear semester section',
      populate: {
        path: 'courseId',
        select: 'name code credits departmentId',
      },
    })
    .populate('facultyId', 'name email')
    .lean()

  if (!entry || !entry.courseOfferingId) {
    throw new ApiError(
      404,
      'Timetable entry not found.',
      'TIMETABLE_ENTRY_NOT_FOUND',
    )
  }

  return entry
}

/**
 * Creates a timetable entry.
 *
 * Only admins and coordinators can create entries.
 */
async function createTimetableEntry(user, input) {
  requireManager(user)

  const validatedInput = validateCreateTimetableEntry(input)

  await requireActiveOffering(user, validatedInput.courseOfferingId)

  await requireActiveFacultyAssignment(
    validatedInput.facultyId,
    validatedInput.courseOfferingId,
  )

  await checkScheduleConflicts(validatedInput)

  const entry = new TimetableEntry({
    ...validatedInput,
    isActive: true,
  })

  await entry.save()

  return entry
}

/**
 * Updates an active timetable entry.
 *
 * Partial updates are merged with the existing document before
 * validating the final time range and checking schedule conflicts.
 */
async function updateTimetableEntry(user, entryId, input) {
  requireManager(user)
  validateTimetableEntryId(entryId)

  const validatedInput = validateUpdateTimetableEntry(input)

  const entry = await TimetableEntry.findOne({
    _id: entryId,
    isActive: true,
  })

  if (!entry) {
    throw new ApiError(
      404,
      'Active timetable entry not found.',
      'TIMETABLE_ENTRY_NOT_FOUND',
    )
  }

  // Verify the caller can manage the existing offering.
  await findAuthorizedOffering(user, entry.courseOfferingId)

  const updated = {
    courseOfferingId: validatedInput.courseOfferingId ?? entry.courseOfferingId,
    facultyId: validatedInput.facultyId ?? entry.facultyId,
    dayOfWeek: validatedInput.dayOfWeek ?? entry.dayOfWeek,
    startTime: validatedInput.startTime ?? entry.startTime,
    endTime: validatedInput.endTime ?? entry.endTime,
    room: validatedInput.room ?? entry.room,
    mode: validatedInput.mode ?? entry.mode,
  }

  // Validate the final time range, including unchanged existing values.
  if (updated.startTime >= updated.endTime) {
    throw new ApiError(
      400,
      'End time must be later than start time.',
      'VALIDATION_ERROR',
    )
  }

  await requireActiveOffering(user, updated.courseOfferingId)

  await requireActiveFacultyAssignment(
    updated.facultyId,
    updated.courseOfferingId,
  )

  await checkScheduleConflicts(updated, entry._id)

  Object.assign(entry, updated)

  await entry.save()

  return entry
}

/**
 * Soft-deactivates an active timetable entry.
 * The original document is retained for academic history.
 */
async function deactivateTimetableEntry(user, entryId) {
  requireManager(user)
  validateTimetableEntryId(entryId)

  const entry = await TimetableEntry.findOne({
    _id: entryId,
    isActive: true,
  })

  if (!entry) {
    throw new ApiError(
      404,
      'Active timetable entry not found.',
      'TIMETABLE_ENTRY_NOT_FOUND',
    )
  }

  await findAuthorizedOffering(user, entry.courseOfferingId)

  entry.isActive = false

  await entry.save()

  return entry
}

module.exports = {
  createTimetableEntry,
  getTimetableEntries,
  getTimetableEntry,
  updateTimetableEntry,
  deactivateTimetableEntry,
}
