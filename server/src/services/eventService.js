const mongoose = require('mongoose')

const Event = require('../models/Event')
const Club = require('../models/Club')
const Department = require('../models/Department')
const ApiError = require('../utils/ApiError')

const VIEWER_ROLES = ['student', 'faculty', 'coordinator', 'admin']
const MANAGER_ROLES = ['coordinator', 'admin']

function requireAuthenticatedUser(user) {
  if (!user || !user._id || !user.role || !VIEWER_ROLES.includes(user.role)) {
    throw new ApiError(401, 'Authentication is required.', 'AUTHENTICATION_REQUIRED')
  }
}

function requireManager(user) {
  requireAuthenticatedUser(user)
  if (!MANAGER_ROLES.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to manage events.', 'FORBIDDEN')
  }
}

function getCoordinatorDepartmentId(user) {
  if (!user.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(403, 'A valid department assignment is required.', 'DEPARTMENT_REQUIRED')
  }
  return user.departmentId
}

function populateEvent(query) {
  return query
    .populate('clubId', 'name slug category')
    .populate('departmentId', 'name code')
    .populate('createdBy', 'name email role')
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function getEvents(user, filters = {}) {
  requireAuthenticatedUser(user)

  const query = {}
  const isManager = MANAGER_ROLES.includes(user.role)

  if (user.role === 'coordinator') {
    query.departmentId = getCoordinatorDepartmentId(user)
  } else if (user.role !== 'admin') {
    query.status = { $in: ['published', 'cancelled', 'completed'] }
  }

  if (filters.status) {
    if (!isManager && filters.status === 'draft') {
      throw new ApiError(403, 'Draft events are not visible to this role.', 'FORBIDDEN')
    }
    query.status = filters.status
  }
  if (filters.category) query.category = filters.category
  if (filters.clubId) query.clubId = filters.clubId
  if (filters.departmentId) {
    if (user.role === 'coordinator' && filters.departmentId.toString() !== query.departmentId.toString()) {
      throw new ApiError(403, 'You cannot view events from another department.', 'FORBIDDEN')
    }
    query.departmentId = filters.departmentId
  }
  if (filters.q) {
    const expression = new RegExp(escapeRegex(filters.q), 'i')
    query.$or = [{ title: expression }, { description: expression }, { venue: expression }]
  }
  if (filters.upcoming === true) query.startsAt = { $gte: new Date() }
  if (filters.upcoming === false) query.startsAt = { $lt: new Date() }

  return populateEvent(Event.find(query).sort({ startsAt: 1, createdAt: -1 }))
}

async function getEventById(user, eventId) {
  requireAuthenticatedUser(user)
  const query = { _id: eventId }

  if (user.role === 'coordinator') {
    query.departmentId = getCoordinatorDepartmentId(user)
  } else if (user.role !== 'admin') {
    query.status = { $in: ['published', 'cancelled', 'completed'] }
  }

  const event = await populateEvent(Event.findOne(query))
  if (!event) throw new ApiError(404, 'Event not found.', 'EVENT_NOT_FOUND')
  return event
}

async function resolveEventOwnership(user, input) {
  let departmentId

  if (user.role === 'coordinator') {
    departmentId = getCoordinatorDepartmentId(user)
    if (input.departmentId && input.departmentId.toString() !== departmentId.toString()) {
      throw new ApiError(403, 'You cannot create an event for another department.', 'FORBIDDEN')
    }
  } else {
    if (!input.departmentId || !mongoose.isValidObjectId(input.departmentId)) {
      throw new ApiError(400, 'A department is required for this event.', 'DEPARTMENT_REQUIRED')
    }
    departmentId = input.departmentId
  }

  const [department, club] = await Promise.all([
    Department.findOne({ _id: departmentId, isActive: true }),
    Club.findOne({ _id: input.clubId, isActive: true }),
  ])

  if (!department) {
    throw new ApiError(400, 'The selected department does not exist or is inactive.', 'INVALID_DEPARTMENT')
  }
  if (!club) throw new ApiError(404, 'Active club not found.', 'CLUB_NOT_FOUND')
  if (club.departmentId.toString() !== department._id.toString()) {
    throw new ApiError(400, 'The selected club must belong to the event department.', 'CLUB_DEPARTMENT_MISMATCH')
  }

  return { departmentId: department._id, clubId: club._id }
}

async function createEvent(user, input) {
  requireManager(user)
  const ownership = await resolveEventOwnership(user, input)

  const event = await Event.create({
    ...input,
    ...ownership,
    createdBy: user._id,
    status: 'draft',
    publishedAt: null,
    cancelledAt: null,
    completedAt: null,
    cancellationReason: '',
  })

  return populateEvent(Event.findById(event._id))
}

async function findManageableEvent(user, eventId) {
  const filter = { _id: eventId }
  if (user.role === 'coordinator') {
    filter.departmentId = getCoordinatorDepartmentId(user)
  }
  const event = await Event.findOne(filter)
  if (!event) throw new ApiError(404, 'Event not found.', 'EVENT_NOT_FOUND')
  return event
}

async function updateEvent(user, eventId, updates) {
  requireManager(user)
  const event = await findManageableEvent(user, eventId)

  if (event.status !== 'draft') {
    throw new ApiError(409, 'Only draft events can be edited. Create a new draft to make substantial changes.', 'EVENT_NOT_EDITABLE')
  }

  Object.assign(event, updates)
  await event.save()
  return populateEvent(Event.findById(event._id))
}

async function publishEvent(user, eventId) {
  requireManager(user)
  const event = await findManageableEvent(user, eventId)

  if (event.status !== 'draft') {
    throw new ApiError(409, 'Only draft events can be published.', 'INVALID_EVENT_TRANSITION')
  }
  if (event.startsAt <= new Date()) {
    throw new ApiError(400, 'An event must have a future start time before it can be published.', 'EVENT_START_NOT_FUTURE')
  }

  event.status = 'published'
  event.publishedAt = new Date()
  await event.save()
  return populateEvent(Event.findById(event._id))
}

async function cancelEvent(user, eventId, reason = '') {
  requireManager(user)
  const event = await findManageableEvent(user, eventId)

  if (!['draft', 'published'].includes(event.status)) {
    throw new ApiError(409, 'Only draft or published events can be cancelled.', 'INVALID_EVENT_TRANSITION')
  }

  event.status = 'cancelled'
  event.cancelledAt = new Date()
  event.cancellationReason = reason
  await event.save()
  return populateEvent(Event.findById(event._id))
}

async function completeEvent(user, eventId) {
  requireManager(user)
  const event = await findManageableEvent(user, eventId)

  if (event.status !== 'published') {
    throw new ApiError(409, 'Only published events can be marked as completed.', 'INVALID_EVENT_TRANSITION')
  }
  if (event.endsAt > new Date()) {
    throw new ApiError(400, 'An event can be completed only after its scheduled end time.', 'EVENT_NOT_FINISHED')
  }

  event.status = 'completed'
  event.completedAt = new Date()
  await event.save()
  return populateEvent(Event.findById(event._id))
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  completeEvent,
}
