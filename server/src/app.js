const express = require('express')

// Creates the Express application.
// This file defines API routes and middleware.
const app = express()

// Allows Express to read JSON sent in request bodies.
// Example: { "name": "Dharmraj" }
app.use(express.json())

// A simple route used to check whether the API is working.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CampusConnect API is running',
  })
})

module.exports = app
