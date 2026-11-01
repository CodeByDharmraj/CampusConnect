const mongoose = require('mongoose')

const Assignment = require('../models/Assignment')
const Submission = require('../models/Submission')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const storageService = require('./storageService')
const ApiError = require('../utils/ApiError')
const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function requireRole(user, role) {
  if (!user || user.role !== role) {
    throw new ApiError(403, 'You do not have permission.', 'FORBIDDEN')
  }
}

async function getPublishedAssignment(assignmentId) {
  const assignment = await Assignment.findOne({
    _id: assignmentId,
    status: 'published',
  }).populate({
    path: 'courseOfferingId',
    select: 'isActive courseId academicYear semester section',
  })

  if (!assignment || !assignment.courseOfferingId?.isActive) {
    throw new ApiError(
      404,
      'Published assignment not found.',
      'ASSIGNMENT_NOT_FOUND',
    )
  }

  return assignment
}

async function requireEnrolledStudent(studentId, offeringId) {
  const enrollment = await Enrollment.exists({
    studentId,
    courseOfferingId: offeringId,
    status: 'enrolled',
  })

  if (!enrollment) {
    throw new ApiError(
      403,
      'You are not enrolled in this course offering.',
      'ENROLLMENT_REQUIRED',
    )
  }
}

async function requireAssignmentFaculty(facultyId, assignment) {
  if (String(assignment.facultyId) !== String(facultyId)) {
    throw new ApiError(
      403,
      'You do not own this assignment.',
      'ASSIGNMENT_OWNERSHIP_REQUIRED',
    )
  }

  const facultyAssignment = await FacultyCourse.exists({
    facultyId,
    courseOfferingId: assignment.courseOfferingId._id,
    isActive: true,
  })

  if (!facultyAssignment) {
    throw new ApiError(
      403,
      'You are no longer assigned to this course offering.',
      'FACULTY_ASSIGNMENT_REQUIRED',
    )
  }
}

function requireBeforeDeadline(assignment) {
  if (!assignment.dueDate || assignment.dueDate <= new Date()) {
    throw new ApiError(
      409,
      'The submission deadline has passed.',
      'SUBMISSION_DEADLINE_PASSED',
    )
  }
}

function validateObjectOwnership(objectKey, studentId, assignmentId) {
  const prefix = `submissions/${studentId}/${assignmentId}/`
  const fileId = objectKey.startsWith(prefix)
    ? objectKey.slice(prefix.length)
    : ''

  if (!UUID_PATTERN.test(fileId)) {
    throw new ApiError(
      403,
      'The storage object does not belong to this student and assignment.',
      'INVALID_STORAGE_OBJECT',
    )
  }
}

function sanitizeFileName(fileName) {
  const normalized = fileName.replace(/\\/g, '/').split('/').pop()

  const safeName = normalized.replace(/[\u0000-\u001f\u007f]/g, '').trim()

  if (!safeName || safeName.length > 255) {
    throw new ApiError(400, 'Invalid file name.', 'INVALID_FILE_NAME')
  }

  return safeName
}

function serializeSubmission(submission) {
  const result = submission.toObject ? submission.toObject() : { ...submission }

  // Never expose private R2 object keys to the browser.
  for (const version of result.versions || []) {
    if (version.file) {
      delete version.file.objectKey
    }
  }

  return result
}

async function createUploadUrl(user, input) {
  requireRole(user, 'student')

  const assignment = await getPublishedAssignment(input.assignmentId)

  await requireEnrolledStudent(user._id, assignment.courseOfferingId._id)

  requireBeforeDeadline(assignment)

  const fileName = sanitizeFileName(input.fileName)

  return storageService.createUploadUrl({
    studentId: user._id,
    assignmentId: assignment._id,
    fileName,
    contentType: input.contentType,
    fileSize: input.fileSize,
  })
}

async function completeSubmission(user, input) {
  requireRole(user, 'student')

  const assignment = await getPublishedAssignment(input.assignmentId)

  await requireEnrolledStudent(user._id, assignment.courseOfferingId._id)

  // Recheck the deadline after the browser upload has completed.
  requireBeforeDeadline(assignment)

  validateObjectOwnership(input.objectKey, user._id, assignment._id)

  const fileName = sanitizeFileName(input.fileName)

  const verifiedFile = await storageService.verifyUploadedObject({
    objectKey: input.objectKey,
    studentId: user._id,
    assignmentId: assignment._id,
    expectedContentType: input.contentType,
    expectedFileSize: input.fileSize,
  })

  const submittedAt = new Date()
  const mongoSession = await mongoose.startSession()

  let savedSubmission

  try {
    await mongoSession.withTransaction(async () => {
      let submission = await Submission.findOne({
        assignmentId: assignment._id,
        studentId: user._id,
      }).session(mongoSession)

      const nextVersion = submission ? submission.currentVersion + 1 : 1

      const version = {
        version: nextVersion,
        file: {
          objectKey: verifiedFile.objectKey,
          originalName: fileName,
          contentType: verifiedFile.contentType,
          size: verifiedFile.fileSize,
          etag: verifiedFile.etag,
        },
        submittedAt,
        isLate: false,
      }

      if (!submission) {
        submission = new Submission({
          assignmentId: assignment._id,
          studentId: user._id,
          versions: [version],
          currentVersion: 1,
          submittedAt,
          isLate: false,
          status: 'submitted',
        })
      } else {
        submission.versions.push(version)
        submission.currentVersion = nextVersion
        submission.submittedAt = submittedAt
        submission.isLate = false

        // A new version must be evaluated independently.
        submission.status = 'submitted'
        submission.grade = null
        submission.feedback = ''
        submission.evaluatedBy = null
        submission.evaluatedAt = null
      }

      await submission.save({ session: mongoSession })
      savedSubmission = submission
    })
  } finally {
    await mongoSession.endSession()
  }

  return serializeSubmission(savedSubmission)
}

async function getMySubmissions(user) {
  requireRole(user, 'student')

  const submissions = await Submission.find({
    studentId: user._id,
  })
    .populate({
      path: 'assignmentId',
      select: 'title description dueDate status courseOfferingId facultyId',
      populate: {
        path: 'courseOfferingId',
        select: 'academicYear semester section courseId',
        populate: {
          path: 'courseId',
          select: 'name code',
        },
      },
    })
    .sort({ submittedAt: -1 })
    .lean()

  return submissions.map(serializeSubmission)
}

async function getAssignmentSubmissions(user, assignmentId) {
  requireRole(user, 'faculty')

  if (!mongoose.isValidObjectId(assignmentId)) {
    throw new ApiError(
      400,
      'A valid assignment ID is required.',
      'VALIDATION_ERROR',
    )
  }

  const assignment = await Assignment.findById(assignmentId).populate({
    path: 'courseOfferingId',
    select: 'isActive',
  })

  if (!assignment || !assignment.courseOfferingId?.isActive) {
    throw new ApiError(404, 'Assignment not found.', 'ASSIGNMENT_NOT_FOUND')
  }

  await requireAssignmentFaculty(user._id, assignment)

  const submissions = await Submission.find({ assignmentId })
    .populate('studentId', 'name email')
    .sort({ submittedAt: -1 })
    .lean()

  return submissions.map(serializeSubmission)
}

async function evaluateSubmission(user, submissionId, input) {
  requireRole(user, 'faculty')

  if (!mongoose.isValidObjectId(submissionId)) {
    throw new ApiError(
      400,
      'A valid submission ID is required.',
      'VALIDATION_ERROR',
    )
  }

  const submission = await Submission.findById(submissionId)

  if (!submission) {
    throw new ApiError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND')
  }

  const assignment = await Assignment.findById(
    submission.assignmentId,
  ).populate({
    path: 'courseOfferingId',
    select: 'isActive',
  })

  if (!assignment || !assignment.courseOfferingId?.isActive) {
    throw new ApiError(404, 'Assignment not found.', 'ASSIGNMENT_NOT_FOUND')
  }

  await requireAssignmentFaculty(user._id, assignment)

  submission.grade = input.grade
  submission.feedback = input.feedback
  submission.status = 'evaluated'
  submission.evaluatedBy = user._id
  submission.evaluatedAt = new Date()

  await submission.save()

  return serializeSubmission(submission)
}

async function createSubmissionDownloadUrl(user, submissionId) {
  if (!user || !['student', 'faculty'].includes(user.role)) {
    throw new ApiError(403, 'You do not have permission.', 'FORBIDDEN')
  }

  if (!mongoose.isValidObjectId(submissionId)) {
    throw new ApiError(
      400,
      'A valid submission ID is required.',
      'VALIDATION_ERROR',
    )
  }

  const submission = await Submission.findById(submissionId)

  if (!submission) {
    throw new ApiError(404, 'Submission not found.', 'SUBMISSION_NOT_FOUND')
  }

  if (user.role === 'student') {
    if (String(submission.studentId) !== String(user._id)) {
      throw new ApiError(
        403,
        'You can only download your own submissions.',
        'SUBMISSION_OWNERSHIP_REQUIRED',
      )
    }
  } else {
    const assignment = await Assignment.findById(
      submission.assignmentId,
    ).populate({
      path: 'courseOfferingId',
      select: 'isActive',
    })

    if (!assignment || !assignment.courseOfferingId?.isActive) {
      throw new ApiError(404, 'Assignment not found.', 'ASSIGNMENT_NOT_FOUND')
    }

    await requireAssignmentFaculty(user._id, assignment)
  }

  const currentVersion = submission.versions.find(
    (version) => version.version === submission.currentVersion,
  )

  if (!currentVersion) {
    throw new ApiError(
      500,
      'The current submission file is unavailable.',
      'SUBMISSION_FILE_UNAVAILABLE',
    )
  }

  const downloadUrl = await storageService.createDownloadUrl(
    currentVersion.file.objectKey,
  )

  return {
    downloadUrl,
    expiresIn: 300,
  }
}

async function getDepartmentSubmissions(user) {
  requireRole(user, 'coordinator')

  if (!user.departmentId) {
    throw new ApiError(
      403,
      'Your account is not assigned to a department.',
      'DEPARTMENT_NOT_ASSIGNED',
    )
  }

  // Find courses owned by the coordinator's department.
  const courses = await Course.find({
    departmentId: user.departmentId,
  })
    .select('_id')
    .lean()

  if (courses.length === 0) {
    return { submissions: [] }
  }

  const courseIds = courses.map((course) => course._id)

  // Find offerings belonging to those courses.
  const offerings = await CourseOffering.find({
    courseId: { $in: courseIds },
  })
    .select('_id')
    .lean()

  if (offerings.length === 0) {
    return { submissions: [] }
  }

  const offeringIds = offerings.map((offering) => offering._id)

  // Find assignments attached to those offerings.
  const assignments = await Assignment.find({
    courseOfferingId: { $in: offeringIds },
  })
    .select('_id')
    .lean()

  if (assignments.length === 0) {
    return { submissions: [] }
  }

  const assignmentIds = assignments.map((assignment) => assignment._id)

  const submissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
  })
    .populate({
      path: 'studentId',
      select: 'name email',
    })
    .populate({
      path: 'assignmentId',
      select: 'title dueDate courseOfferingId facultyId',
      populate: {
        path: 'courseOfferingId',
        select: 'academicYear semester section courseId',
        populate: {
          path: 'courseId',
          select: 'name code departmentId',
        },
      },
    })
    .sort({ submittedAt: -1 })
    .lean()

  return {
    submissions: submissions.map(serializeSubmission),
  }
}

async function getInstitutionSubmissions(user) {
  requireRole(user, 'admin')

  const submissions = await Submission.find({})
    .populate({
      path: 'studentId',
      select: 'name email departmentId',
    })
    .populate({
      path: 'assignmentId',
      select: 'title dueDate courseOfferingId facultyId',
      populate: {
        path: 'courseOfferingId',
        select: 'academicYear semester section courseId',
        populate: {
          path: 'courseId',
          select: 'courseCode courseName departmentId',
        },
      },
    })
    .sort({ submittedAt: -1 })
    .lean()

  return {
    submissions: submissions.map(serializeSubmission),
  }
}

module.exports = {
  createUploadUrl,
  completeSubmission,
  getMySubmissions,
  getAssignmentSubmissions,
  evaluateSubmission,
  getDepartmentSubmissions,
  getInstitutionSubmissions,
}
