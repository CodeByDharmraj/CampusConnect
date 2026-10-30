const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const env = require('./config/env')
const requestLogger = require('./middleware/requestLogger')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')
const authRoutes = require('./routes/authRoutes')

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

// Authentication routes will be registered here before notFound.
app.use('/api/v1/auth', authRoutes)

// Unknown routes must be handled after all registered routes.
app.use(notFound)

// Error handler must be registered after routes and 404 middleware.
app.use(errorHandler)

module.exports = app
