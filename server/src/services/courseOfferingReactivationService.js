const mongoose = require('mongoose')

const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const CourseOfferingReactivationRequest = require('../models/CourseOfferingReactivationRequest')
const ApiError = require('../utils/ApiError')

function requireCoordinator(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (user.role !== 'coordinator') {
    throw new ApiError(
      403,
      'Only department coordinators can request reactivation.',
      'FORBIDDEN',
    )
  }

  if (!user.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(
      403,
      'A valid department assignment is required.',
      'FORBIDDEN',
    )
  }
}

function requireAdministrator(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (user.role !== 'admin') {
    throw new ApiError(
      403,
      'Only administrators can decide reactivation requests.',
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

function validateRequestReason(reason) {
  if (
    typeof reason !== 'string' ||
    reason.trim().length < 10 ||
    reason.trim().length > 1000
  ) {
    throw new ApiError(
      400,
      'The request reason must contain between 10 and 1000 characters.',
      'VALIDATION_ERROR',
    )
  }

  return reason.trim()
}

function handleDuplicatePendingRequest(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'A pending reactivation request already exists for this offering.',
      'REACTIVATION_REQUEST_ALREADY_PENDING',
    )
  }

  throw error
}

async function createReactivationRequest(user, offeringId, reason) {
  requireCoordinator(user)
  validateObjectId(offeringId, 'course offering ID')

  const requestReason = validateRequestReason(reason)

  const offering = await CourseOffering.findById(offeringId)

  if (!offering) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  const course = await Course.findOne({
    _id: offering.courseId,
    departmentId: user.departmentId,
  })

  if (!course) {
    throw new ApiError(
      404,
      'Course offering not found.',
      'COURSE_OFFERING_NOT_FOUND',
    )
  }

  if (offering.isActive) {
    throw new ApiError(
      409,
      'This course offering is already active.',
      'COURSE_OFFERING_ALREADY_ACTIVE',
    )
  }

  if (!course.isActive) {
    throw new ApiError(
      409,
      'The parent course is inactive and cannot be reactivated through this request.',
      'PARENT_COURSE_INACTIVE',
    )
  }

  const existingRequest = await CourseOfferingReactivationRequest.findOne({
    courseOfferingId: offeringId,
    status: 'pending',
  })

  if (existingRequest) {
    throw new ApiError(
      409,
      'A pending reactivation request already exists for this offering.',
      'REACTIVATION_REQUEST_ALREADY_PENDING',
    )
  }

  const request = new CourseOfferingReactivationRequest({
    courseOfferingId: offeringId,
    requestedBy: user._id,
    requestReason,
  })

  try {
    await request.save()
    return request
  } catch (error) {
    handleDuplicatePendingRequest(error)
  }
}

async function decideReactivationRequest(
  user,
  requestId,
  decision,
  decisionReason,
) {
  requireAdministrator(user)
  validateObjectId(requestId, 'reactivation request ID')

  const validatedReason = validateRequestReason(decisionReason)
  const session = await mongoose.startSession()

  let decidedRequest

  try {
    await session.withTransaction(async () => {
      const request =
        await CourseOfferingReactivationRequest.findById(requestId).session(
          session,
        )

      if (!request) {
        throw new ApiError(
          404,
          'Reactivation request not found.',
          'REACTIVATION_REQUEST_NOT_FOUND',
        )
      }

      if (request.status !== 'pending') {
        throw new ApiError(
          409,
          'This reactivation request has already been decided.',
          'REACTIVATION_REQUEST_ALREADY_DECIDED',
        )
      }

      if (decision === 'approved') {
        const offering = await CourseOffering.findById(
          request.courseOfferingId,
        ).session(session)

        if (!offering) {
          throw new ApiError(
            404,
            'Course offering not found.',
            'COURSE_OFFERING_NOT_FOUND',
          )
        }

        if (offering.isActive) {
          throw new ApiError(
            409,
            'This course offering is already active.',
            'COURSE_OFFERING_ALREADY_ACTIVE',
          )
        }

        const course = await Course.findOne({
          _id: offering.courseId,
          isActive: true,
        }).session(session)

        if (!course) {
          throw new ApiError(
            409,
            'The parent course is inactive and cannot be reactivated.',
            'PARENT_COURSE_INACTIVE',
          )
        }

        offering.isActive = true
        await offering.save({ session })
      }

      request.status = decision
      request.decidedBy = user._id
      request.decidedAt = new Date()
      request.decisionReason = validatedReason

      await request.save({ session })

      decidedRequest = request
    })

    return decidedRequest
  } finally {
    await session.endSession()
  }
}

async function approveReactivationRequest(user, requestId, reason) {
  return decideReactivationRequest(user, requestId, 'approved', reason)
}

async function rejectReactivationRequest(user, requestId, reason) {
  return decideReactivationRequest(user, requestId, 'rejected', reason)
}

module.exports = {
  createReactivationRequest,
  approveReactivationRequest,
  rejectReactivationRequest,
}
