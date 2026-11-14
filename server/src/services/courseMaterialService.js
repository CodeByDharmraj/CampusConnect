const mongoose = require('mongoose')
const CourseMaterial = require('../models/CourseMaterial')
const CourseOffering = require('../models/CourseOffering')
const FacultyCourse = require('../models/FacultyCourse')
const Enrollment = require('../models/Enrollment')
const storageService = require('./storageService')
const ApiError = require('../utils/ApiError')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function requireRole(user, role) {
  if (!user || user.role !== role || !user.isActive) {
    throw new ApiError(403, 'You do not have permission.', 'FORBIDDEN')
  }
}

function validateObjectId(value, label) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `A valid ${label} ID is required.`, 'VALIDATION_ERROR')
  }
}

function sanitizeFileName(value) {
  const normalized = value.replace(/\\/g, '/').split('/').pop()
  // eslint-disable-next-line no-control-regex -- Remove control characters from untrusted filenames.
  const safeName = normalized.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!safeName || safeName.length > 255) {
    throw new ApiError(400, 'Invalid file name.', 'INVALID_FILE_NAME')
  }
  return safeName
}

function validateObjectKey(objectKey, courseOfferingId) {
  const prefix = `course-materials/${courseOfferingId}/`
  const objectId = objectKey.startsWith(prefix) ? objectKey.slice(prefix.length) : ''
  if (!UUID_PATTERN.test(objectId)) {
    throw new ApiError(403, 'The storage object does not belong to this course offering.', 'INVALID_STORAGE_OBJECT')
  }
}

async function requireFacultyOffering(facultyId, courseOfferingId) {
  const assignment = await FacultyCourse.exists({
    facultyId,
    courseOfferingId,
    isActive: true,
  })
  if (!assignment) {
    throw new ApiError(403, 'You are not assigned to this course offering.', 'FACULTY_ASSIGNMENT_REQUIRED')
  }

  const offering = await CourseOffering.findOne({ _id: courseOfferingId, isActive: true })
  if (!offering) {
    throw new ApiError(404, 'Active course offering not found.', 'COURSE_OFFERING_NOT_FOUND')
  }
  return offering
}

async function requireStudentEnrollment(studentId, courseOfferingId) {
  const enrollment = await Enrollment.exists({
    studentId,
    courseOfferingId,
    status: 'enrolled',
  })
  if (!enrollment) {
    throw new ApiError(403, 'You are not enrolled in this course offering.', 'ENROLLMENT_REQUIRED')
  }
}

function serializeMaterial(material) {
  const result = material.toObject ? material.toObject() : { ...material }
  delete result.storageKey
  return result
}

async function createUploadUrl(user, input) {
  requireRole(user, 'faculty')
  validateObjectId(input.courseOfferingId, 'course offering')
  await requireFacultyOffering(user._id, input.courseOfferingId)

  const fileName = sanitizeFileName(input.fileName)
  return storageService.createCourseMaterialUploadUrl({
    facultyId: user._id,
    courseOfferingId: input.courseOfferingId,
    fileName,
    contentType: input.contentType,
    fileSize: input.fileSize,
  })
}

async function completeUpload(user, input) {
  requireRole(user, 'faculty')
  validateObjectId(input.courseOfferingId, 'course offering')
  await requireFacultyOffering(user._id, input.courseOfferingId)
  validateObjectKey(input.objectKey, input.courseOfferingId)

  const fileName = sanitizeFileName(input.fileName)
  const verified = await storageService.verifyCourseMaterialObject({
    objectKey: input.objectKey,
    facultyId: user._id,
    courseOfferingId: input.courseOfferingId,
    expectedContentType: input.contentType,
    expectedFileSize: input.fileSize,
  })

  const material = await CourseMaterial.create({
    courseOfferingId: input.courseOfferingId,
    uploadedBy: user._id,
    title: input.title,
    description: input.description,
    storageKey: verified.objectKey,
    originalName: fileName,
    mimeType: verified.contentType,
    sizeBytes: verified.fileSize,
    etag: verified.etag,
    visibility: input.visibility,
  })

  return serializeMaterial(material)
}

async function getOfferingMaterials(user, courseOfferingId) {
  validateObjectId(courseOfferingId, 'course offering')
  let filter = { courseOfferingId }

  if (user?.role === 'faculty') {
    await requireFacultyOffering(user._id, courseOfferingId)
  } else if (user?.role === 'student' && user.isActive) {
    await requireStudentEnrollment(user._id, courseOfferingId)
    filter.visibility = 'enrolled'
  } else {
    throw new ApiError(403, 'You do not have permission.', 'FORBIDDEN')
  }

  const materials = await CourseMaterial.find(filter)
    .select('-storageKey')
    .populate({
      path: 'courseOfferingId',
      select: 'academicYear semester section courseId',
      populate: { path: 'courseId', select: 'name code' },
    })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean()

  return { materials }
}

async function createDownloadUrl(user, materialId) {
  validateObjectId(materialId, 'course material')
  const material = await CourseMaterial.findById(materialId).select('+storageKey')
  if (!material) {
    throw new ApiError(404, 'Course material not found.', 'COURSE_MATERIAL_NOT_FOUND')
  }

  if (user?.role === 'faculty' && user.isActive) {
    await requireFacultyOffering(user._id, material.courseOfferingId)
  } else if (user?.role === 'student' && user.isActive) {
    if (material.visibility !== 'enrolled') {
      throw new ApiError(404, 'Course material not found.', 'COURSE_MATERIAL_NOT_FOUND')
    }
    await requireStudentEnrollment(user._id, material.courseOfferingId)
  } else {
    throw new ApiError(403, 'You do not have permission.', 'FORBIDDEN')
  }

  const downloadUrl = await storageService.createDownloadUrl(material.storageKey)
  return { downloadUrl, expiresIn: 300 }
}

async function deleteMaterial(user, materialId) {
  requireRole(user, 'faculty')
  validateObjectId(materialId, 'course material')

  const material = await CourseMaterial.findById(materialId).select('+storageKey')
  if (!material) {
    throw new ApiError(404, 'Course material not found.', 'COURSE_MATERIAL_NOT_FOUND')
  }

  await requireFacultyOffering(user._id, material.courseOfferingId)
  if (String(material.uploadedBy) !== String(user._id)) {
    throw new ApiError(403, 'Only the uploading faculty member can delete this material.', 'MATERIAL_OWNER_REQUIRED')
  }

  const storageKey = material.storageKey
  await material.deleteOne()

  // Database deletion is committed before object cleanup, avoiding a database
  // record that points to a file that was already deleted.
  await storageService.deleteObject(storageKey)
  return { deleted: true, materialId: String(materialId) }
}

module.exports = {
  createUploadUrl,
  completeUpload,
  getOfferingMaterials,
  createDownloadUrl,
  deleteMaterial,
}
