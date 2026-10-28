const app = require('./app')

// Uses the configured port or defaults to port 5000.
const PORT = process.env.PORT || 5000

// Starts the HTTP server so the API can receive requests.
app.listen(PORT, () => {
  console.log(`CampusConnect API listening on port ${PORT}`)
})
