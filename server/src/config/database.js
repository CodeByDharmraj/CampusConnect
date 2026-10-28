const mongoose = require('mongoose')
const env = require('./env')

// Connect to Atlas before the API starts accepting requests.
async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  console.log('MongoDB connection established')
}

// Close the database connection during graceful shutdown.
async function disconnectDatabase() {
  await mongoose.disconnect()
  console.log('MongoDB connection closed')
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
}
