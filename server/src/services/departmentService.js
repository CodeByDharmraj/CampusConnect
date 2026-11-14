const mongoose = require('mongoose')

const Department = require('../models/Department')
const ApiError = require('../utils/ApiError')

function requireAuthenticatedUser(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(
      401,
      'Authentication is required.',
      'AUTHENTICATION_REQUIRED',
    )
  }

  if (!['admin', 'coordinator'].includes(user.role)) {
    throw new ApiError(403, 'Access denied.', 'FORBIDDEN')
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

async function getDepartments(user) {
  requireAuthenticatedUser(user)

  if (user.role === 'admin') {
    return Department.find({}).sort({ name: 1 })
  }

  const departmentId = getCoordinatorDepartmentId(user)

  return Department.find({ _id: departmentId }).sort({ name: 1 })
}

async function createDepartment(user, input) {
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
      'Only administrators can create departments.',
      'FORBIDDEN',
    )
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(
      400,
      'Department details must be provided.',
      'VALIDATION_ERROR',
    )
  }

  const department = new Department({
    name: input.name,
    code: input.code,
    description: input.description ?? '',
    isActive: true,
  })

  try {
    await department.save()
    return department
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(
        409,
        'A department with this code already exists.',
        'DEPARTMENT_CODE_ALREADY_EXISTS',
      )
    }

    throw error
  }
}

module.exports = {
  getDepartments,
  createDepartment,
}
