const mongoose = require('mongoose')
const env = require('../src/config/env')

async function inspect() {
  try {
    await mongoose.connect(env.MONGODB_URI)

    const collections = [
      'departments',
      'courses',
      'enrollments',
      'facultycourses',
      'users',
    ]

    console.log('\n--- DATABASE DOCUMENT COUNTS ---')

    for (const name of collections) {
      const count = await mongoose.connection.db
        .collection(name)
        .countDocuments()

      console.log(`${name}: ${count}`)
    }
  } catch (error) {
    console.error('Database inspection failed:', error.name)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

inspect()
