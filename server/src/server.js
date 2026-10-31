const http = require('node:http')
const app = require('./app')
const env = require('./config/env')
const { connectDatabase, disconnectDatabase } = require('./config/database')
const initializeAcademicIndexes = require('./config/initializeAcademicIndexes')

async function startServer() {
  // The API must not start if the database connection fails.
  await connectDatabase()

  // Academic collections and their indexes must be ready before requests.
  await initializeAcademicIndexes()

  const server = http.createServer(app)

  // Wait until the HTTP server is listening or startup fails.
  await new Promise((resolve, reject) => {
    server.once('error', reject)

    server.listen(env.PORT, () => {
      server.off('error', reject)
      resolve()
    })
  })

  console.log(`CampusConnect API listening on port ${env.PORT}`)

  let isShuttingDown = false

  async function shutdown(signal) {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    console.log(`Received ${signal}; shutting down gracefully`)

    try {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'HTTP server shutdown failed',
          errorName: error.name || 'Error',
        }),
      )
      process.exitCode = 1
    } finally {
      try {
        await disconnectDatabase()
      } catch (error) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Database shutdown failed',
            errorName: error.name || 'Error',
          }),
        )
        process.exitCode = 1
      }
    }
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  return server
}

startServer().catch(async (error) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'Application startup failed',
      errorName: error.name || 'Error',
    }),
  )

  try {
    await disconnectDatabase()
  } catch {
    // Preserve the original startup failure without exposing details.
  }

  process.exitCode = 1
})
