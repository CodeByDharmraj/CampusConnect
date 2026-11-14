const mongoose = require('mongoose')

const Club = require('../models/Club')
const Department = require('../models/Department')
const ApiError = require('../utils/ApiError')

const VIEWER_ROLES = ['student', 'faculty', 'coordinator', 'admin']
const MANAGER_ROLES = ['coordinator', 'admin']

function requireAuthenticatedUser(user) {
  if (!user || !user._id || !user.role) {
    throw new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED')
  }
  if (!VIEWER_ROLES.includes(user.role)) {
    throw new ApiError(403, 'Access denied.', 'FORBIDDEN')
  }
}

function requireManager(user) {
  requireAuthenticatedUser(user)
  if (!MANAGER_ROLES.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to manage clubs.', 'FORBIDDEN')
  }
}

function coordinatorDepartmentId(user) {
  if (!user.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(403, 'A valid department assignment is required.', 'DEPARTMENT_REQUIRED')
  }
  return user.departmentId
}

function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '')

  return slug || 'club'
}

async function createUniqueSlug(name) {
  const base = slugify(name)
  let candidate = base
  let suffix = 2

  while (await Club.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  return candidate
}

function handleDuplicateSlug(error) {
  if (error?.code === 11000) {
    throw new ApiError(
      409,
      'A club with a conflicting URL slug already exists. Please try again.',
      'CLUB_SLUG_CONFLICT',
    )
  }
  throw error
}

function populateClub(query) {
  return query
    .populate('departmentId', 'name code')
    .populate('coordinatorId', 'name email')
    .populate('createdBy', 'name role')
}

async function getClubs(user, filters = {}) {
  requireAuthenticatedUser(user)

  const query = { isActive: true }
  if (filters.category) query.category = filters.category
  if (filters.departmentId) query.departmentId = filters.departmentId

  if (filters.q) {
    const escaped = filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ]
  }

  return populateClub(Club.find(query).sort({ name: 1 }))
}

async function getClubBySlug(user, slug) {
  requireAuthenticatedUser(user)

  const club = await populateClub(
    Club.findOne({ slug, isActive: true }),
  )

  if (!club) throw new ApiError(404, 'Club not found.', 'CLUB_NOT_FOUND')
  return club
}

async function createClub(user, input) {
  requireManager(user)

  let departmentId
  let coordinatorId = user.role === 'coordinator' ? user._id : null

  if (user.role === 'coordinator') {
    departmentId = coordinatorDepartmentId(user)
    if (
      input.departmentId &&
      input.departmentId.toString() !== departmentId.toString()
    ) {
      throw new ApiError(403, 'You cannot create a club for another department.', 'FORBIDDEN')
    }
  } else {
    if (!input.departmentId || !mongoose.isValidObjectId(input.departmentId)) {
      throw new ApiError(400, 'A department is required for this club.', 'VALIDATION_ERROR')
    }
    departmentId = input.departmentId
  }

  const department = await Department.findOne({
    _id: departmentId,
    isActive: true,
  })
  if (!department) {
    throw new ApiError(400, 'The selected department does not exist or is inactive.', 'INVALID_DEPARTMENT')
  }

  const slug = await createUniqueSlug(input.name)
  const club = new Club({
    ...input,
    slug,
    departmentId,
    coordinatorId,
    createdBy: user._id,
    isActive: true,
  })

  try {
    await club.save()
    return populateClub(Club.findById(club._id))
  } catch (error) {
    handleDuplicateSlug(error)
  }
}

async function findManageableClub(user, clubId) {
  const filter = { _id: clubId }
  if (user.role === 'coordinator') {
    filter.departmentId = coordinatorDepartmentId(user)
  }
  const club = await Club.findOne(filter)
  if (!club) throw new ApiError(404, 'Club not found.', 'CLUB_NOT_FOUND')
  return club
}

async function updateClub(user, clubId, updates) {
  requireManager(user)
  const club = await findManageableClub(user, clubId)

  for (const [field, value] of Object.entries(updates)) {
    club[field] = value
  }

  try {
    await club.save()
    return populateClub(Club.findById(club._id))
  } catch (error) {
    handleDuplicateSlug(error)
  }
}

async function deactivateClub(user, clubId) {
  requireManager(user)
  const club = await findManageableClub(user, clubId)

  if (!club.isActive) return club
  club.isActive = false
  await club.save()
  return populateClub(Club.findById(club._id))
}

module.exports = {
  getClubs,
  getClubBySlug,
  createClub,
  updateClub,
  deactivateClub,
}
