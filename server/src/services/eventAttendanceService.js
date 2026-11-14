const mongoose = require('mongoose')

const Event = require('../models/Event')
const EventRegistration = require('../models/EventRegistration')
const EventAttendance = require('../models/EventAttendance')
const ApiError = require('../utils/ApiError')

function departmentForCoordinator(user) {
  if (!user?.departmentId || !mongoose.isValidObjectId(user.departmentId)) {
    throw new ApiError(403, 'A valid department assignment is required.', 'DEPARTMENT_REQUIRED')
  }
  return user.departmentId
}

async function findManageableEvent(user, eventId, session = null) {
  const filter = { _id: eventId }
  if (user.role === 'coordinator') filter.departmentId = departmentForCoordinator(user)
  let query = Event.findOne(filter).populate('clubId', 'name slug').populate('departmentId', 'name code')
  if (session) query = query.session(session)
  const event = await query
  if (!event) throw new ApiError(404, 'Event not found.', 'EVENT_NOT_FOUND')
  if (!['published', 'completed'].includes(event.status)) {
    throw new ApiError(409, 'Attendance is available only for published or completed events.', 'EVENT_ATTENDANCE_UNAVAILABLE')
  }
  if (event.startsAt > new Date()) {
    throw new ApiError(409, 'Event attendance can be recorded after the event has started.', 'EVENT_NOT_STARTED')
  }
  return event
}

async function getEventParticipants(user, eventId) {
  if (!['coordinator', 'admin'].includes(user?.role)) {
    throw new ApiError(403, 'Only coordinators and administrators can view event participants.', 'FORBIDDEN')
  }
  const event = await findManageableEvent(user, eventId)
  const registrations = await EventRegistration.find({ eventId, status: 'registered' })
    .sort({ registeredAt: 1 })
    .populate('studentId', 'name email departmentId')
    .lean()
  const attendance = await EventAttendance.find({ eventId }).lean()
  const attendanceByStudent = new Map(attendance.map((record) => [record.studentId.toString(), record]))

  const participants = registrations.map((registration) => {
    const record = attendanceByStudent.get(registration.studentId?._id?.toString())
    return {
      registrationId: registration._id,
      student: registration.studentId,
      registeredAt: registration.registeredAt,
      attendanceStatus: record?.status || 'unmarked',
      markedAt: record?.markedAt || null,
    }
  })

  return {
    event,
    participants,
    summary: {
      registered: participants.length,
      present: participants.filter((item) => item.attendanceStatus === 'present').length,
      absent: participants.filter((item) => item.attendanceStatus === 'absent').length,
      unmarked: participants.filter((item) => item.attendanceStatus === 'unmarked').length,
    },
  }
}

async function markEventAttendance(user, eventId, records) {
  if (!['coordinator', 'admin'].includes(user?.role)) {
    throw new ApiError(403, 'Only coordinators and administrators can mark event attendance.', 'FORBIDDEN')
  }

  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      const event = await findManageableEvent(user, eventId, session)
      const studentIds = records.map((record) => record.studentId)
      const registrations = await EventRegistration.find({
        eventId: event._id,
        studentId: { $in: studentIds },
        status: 'registered',
      }).session(session)

      if (registrations.length !== records.length) {
        throw new ApiError(400, 'Attendance can be marked only for actively registered participants.', 'INVALID_EVENT_PARTICIPANT')
      }

      const registrationByStudent = new Map(registrations.map((item) => [item.studentId.toString(), item]))
      const markedAt = new Date()
      const operations = records.map((record) => {
        const registration = registrationByStudent.get(record.studentId)
        return {
          updateOne: {
            filter: { eventId: event._id, studentId: record.studentId },
            update: {
              $set: {
                registrationId: registration._id,
                status: record.status,
                markedBy: user._id,
                markedAt,
              },
            },
            upsert: true,
          },
        }
      })
      await EventAttendance.bulkWrite(operations, { session, ordered: true })
      result = { eventId: event._id, updatedCount: records.length, markedAt }
    })
  } finally {
    await session.endSession()
  }

  return result
}

module.exports = { getEventParticipants, markEventAttendance }
