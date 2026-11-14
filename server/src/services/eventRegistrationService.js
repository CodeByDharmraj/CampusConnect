const mongoose = require('mongoose')

const Event = require('../models/Event')
const EventRegistration = require('../models/EventRegistration')
const ApiError = require('../utils/ApiError')

function requireStudent(user) {
  if (!user || !user._id || user.role !== 'student') {
    throw new ApiError(403, 'Only student accounts can register for events.', 'STUDENT_REQUIRED')
  }
}

function registrationWindowQuery(now) {
  return {
    status: 'published',
    startsAt: { $gt: now },
    $and: [
      {
        $or: [
          { registrationOpensAt: null },
          { registrationOpensAt: { $exists: false } },
          { registrationOpensAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { registrationClosesAt: null },
          { registrationClosesAt: { $exists: false } },
          { registrationClosesAt: { $gt: now } },
        ],
      },
      {
        $or: [
          { capacity: null },
          { capacity: { $exists: false } },
          { $expr: { $lt: ['$registeredCount', '$capacity'] } },
        ],
      },
    ],
  }
}

function mapRegistrationFailure(error) {
  if (error?.code === 11000) {
    return new ApiError(409, 'You are already registered for this event.', 'DUPLICATE_EVENT_REGISTRATION')
  }
  return error
}

async function registerForEvent(user, eventId) {
  requireStudent(user)
  const session = await mongoose.startSession()
  let registration

  try {
    await session.withTransaction(async () => {
      const existing = await EventRegistration.findOne({
        eventId,
        studentId: user._id,
      }).session(session)

      if (existing?.status === 'registered') {
        throw new ApiError(
          409,
          'You are already registered for this event.',
          'DUPLICATE_EVENT_REGISTRATION',
        )
      }

      const now = new Date()
      const event = await Event.findOneAndUpdate(
        { _id: eventId, ...registrationWindowQuery(now) },
        { $inc: { registeredCount: 1 } },
        { new: true, session, runValidators: true },
      )

      if (!event) {
        const currentEvent = await Event.findById(eventId).session(session)
        if (!currentEvent) {
          throw new ApiError(404, 'Event not found.', 'EVENT_NOT_FOUND')
        }
        if (currentEvent.status !== 'published') {
          throw new ApiError(409, 'This event is not open for registration.', 'EVENT_NOT_OPEN')
        }
        if (currentEvent.startsAt <= now) {
          throw new ApiError(409, 'Registration is closed because the event has started.', 'REGISTRATION_CLOSED')
        }
        if (currentEvent.registrationOpensAt && currentEvent.registrationOpensAt > now) {
          throw new ApiError(409, 'Registration has not opened yet.', 'REGISTRATION_NOT_OPEN')
        }
        if (currentEvent.registrationClosesAt && currentEvent.registrationClosesAt <= now) {
          throw new ApiError(409, 'The registration deadline has passed.', 'REGISTRATION_CLOSED')
        }
        if (
          currentEvent.capacity != null &&
          currentEvent.registeredCount >= currentEvent.capacity
        ) {
          throw new ApiError(409, 'This event has reached its registration capacity.', 'EVENT_FULL')
        }
        throw new ApiError(409, 'Registration is currently unavailable.', 'REGISTRATION_UNAVAILABLE')
      }

      if (existing) {
        existing.status = 'registered'
        existing.registeredAt = now
        existing.cancelledAt = null
        registration = await existing.save({ session })
      } else {
        ;[registration] = await EventRegistration.create(
          [
            {
              eventId: event._id,
              studentId: user._id,
              status: 'registered',
              registeredAt: now,
            },
          ],
          { session },
        )
      }
    })
  } catch (error) {
    throw mapRegistrationFailure(error)
  } finally {
    await session.endSession()
  }

  return EventRegistration.findById(registration._id)
    .populate('eventId', 'title category startsAt endsAt venue status capacity registeredCount clubId departmentId')
}

async function cancelRegistration(user, eventId) {
  requireStudent(user)
  const session = await mongoose.startSession()
  let registration

  try {
    await session.withTransaction(async () => {
      const now = new Date()
      registration = await EventRegistration.findOneAndUpdate(
        { eventId, studentId: user._id, status: 'registered' },
        { $set: { status: 'cancelled', cancelledAt: now } },
        { new: true, session },
      )

      if (!registration) {
        const existing = await EventRegistration.findOne({ eventId, studentId: user._id }).session(session)
        if (!existing) {
          throw new ApiError(404, 'You do not have a registration for this event.', 'REGISTRATION_NOT_FOUND')
        }
        throw new ApiError(409, 'This event registration is already cancelled.', 'REGISTRATION_ALREADY_CANCELLED')
      }

      const event = await Event.findOneAndUpdate(
        { _id: eventId, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } },
        { new: true, session },
      )

      if (!event) {
        throw new ApiError(409, 'The event registration count is inconsistent. Please contact an administrator.', 'REGISTRATION_COUNT_INCONSISTENT')
      }
    })
  } finally {
    await session.endSession()
  }

  return registration.populate('eventId', 'title category startsAt endsAt venue status capacity registeredCount')
}

async function getMyRegistrations(user, filters = {}) {
  requireStudent(user)
  const query = { studentId: user._id }
  if (filters.status) query.status = filters.status

  return EventRegistration.find(query)
    .sort({ registeredAt: -1 })
    .populate('eventId', 'title description category startsAt endsAt venue status capacity registeredCount clubId departmentId')
}

module.exports = {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
}
