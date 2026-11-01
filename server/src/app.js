const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const env = require('./config/env')
const requestLogger = require('./middleware/requestLogger')
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

// Creates the Express application.
const app = express()

// Logs request metadata without recording secrets or request bodies.
app.use(requestLogger)

// Allows requests only from the configured frontend origin.
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Allows Express to read JSON sent in request bodies.
app.use(express.json({ limit: '10kb' }))

// Parses cookies so authentication routes can read refresh tokens.
app.use(cookieParser())

// Public endpoint used to check whether the API is working.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusConnect API is running',
    data: {
      status: 'ok',
    },
  })
})

// Authentication endpoints.
app.use('/api/v1/auth', authRoutes)

// Course management and visibility endpoints.
app.use('/api/v1/courses', courseRoutes)

// Faculty assignment management for course offerings.
app.use('/api/v1/course-offerings', courseOfferingRoutes)

// Administrator-only student enrollment management.
app.use('/api/v1/enrollments', enrollmentRoutes)

// Department management endpoints.
app.use('/api/v1/departments', departmentRoutes)

// Timetable management and role-scoped timetable visibility.
app.use('/api/v1/timetable', timetableRoutes)

// Assignment creation, publication and role-scoped visibility.
app.use('/api/v1/assignments', assignmentRoutes)

// Role-scoped announcement publishing and reading.
app.use('/api/v1/announcements', announcementRoutes)

// Role-scoped attendance sessions, records and correction requests.
app.use('/api/v1/attendance', attendanceRoutes)

// Student submissions, faculty evaluation and secure file downloads.
app.use('/api/v1/submissions', submissionRoutes)

app.use('/api/v1/attendance/faculty', attendanceFacultyRoutes)

// Unknown routes must be handled after all registered routes.
app.use(notFound)

// Error handler must be registered after routes and 404 middleware.
app.use(errorHandler)

module.exports = app
