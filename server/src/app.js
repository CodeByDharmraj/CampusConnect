const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const env = require('./config/env')
const requestLogger = require('./middleware/requestLogger')
const securityHeaders = require('./middleware/securityHeaders')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')
const authRoutes = require('./routes/authRoutes')
const courseRoutes = require('./routes/courseRoutes')
const courseOfferingRoutes = require('./routes/courseOfferingRoutes')
const enrollmentRoutes = require('./routes/enrollmentRoutes')
const departmentRoutes = require('./routes/departmentRoutes')
const timetableRoutes = require('./routes/timetableRoutes')
const assignmentRoutes = require('./routes/assignmentRoutes')
const announcementRoutes = require('./routes/announcementRoutes')
const attendanceRoutes = require('./routes/attendanceRoutes')
const submissionRoutes = require('./routes/submissionRoutes')
const attendanceFacultyRoutes = require('./routes/attendanceFacultyRoutes')
const attendanceSessionRoutes = require('./routes/attendanceSessionRoutes')
const courseMaterialRoutes = require('./routes/courseMaterialRoutes')
const clubRoutes = require('./routes/clubRoutes')
const eventRoutes = require('./routes/eventRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')

const app = express()

// Avoid disclosing the framework in response headers.
app.disable('x-powered-by')

// Trust only the explicitly configured number of reverse-proxy hops.
app.set('trust proxy', env.TRUST_PROXY_HOPS)

app.use(securityHeaders)
app.use(requestLogger)

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin === env.CLIENT_ORIGIN)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
)

app.use(express.json({ limit: '10kb', strict: true }))
app.use(cookieParser())

// Liveness answers whether this process is alive; it does not depend on MongoDB.
app.get('/api/v1/health/live', (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'alive' },
  })
})

// Readiness is used by deployment platforms before routing production traffic.
app.get('/api/v1/health/ready', (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1

  return res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    data: {
      status: databaseReady ? 'ready' : 'not_ready',
      dependencies: {
        database: databaseReady ? 'connected' : 'unavailable',
      },
    },
  })
})

// Preserve the original health contract for existing monitors and tests.
// New deployment health checks should use /health/ready.
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusConnect API is running',
    data: { status: 'ok' },
  })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/courses', courseRoutes)
app.use('/api/v1/course-offerings', courseOfferingRoutes)
app.use('/api/v1/enrollments', enrollmentRoutes)
app.use('/api/v1/departments', departmentRoutes)
app.use('/api/v1/timetable', timetableRoutes)
app.use('/api/v1/assignments', assignmentRoutes)
app.use('/api/v1/announcements', announcementRoutes)
app.use('/api/v1/attendance', attendanceRoutes)
app.use('/api/v1/submissions', submissionRoutes)
app.use('/api/v1/course-materials', courseMaterialRoutes)
app.use('/api/v1/clubs', clubRoutes)
app.use('/api/v1/events', eventRoutes)
app.use('/api/v1/attendance/faculty', attendanceFacultyRoutes)
app.use('/api/v1/attendance-sessions', attendanceSessionRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
