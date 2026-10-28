const express = require('express')
const requestLogger = require('./middleware/requestLogger')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

// Creates the Express application.
const app = express()

// Logs request metadata without recording secrets or request bodies.
app.use(requestLogger)

// Allows Express to read JSON sent in request bodies.
app.use(express.json())

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

// Unknown routes must be handled after all registered routes.
app.use(notFound)

// Error handler must be registered after routes and 404 middleware.
app.use(errorHandler)

module.exports = app
