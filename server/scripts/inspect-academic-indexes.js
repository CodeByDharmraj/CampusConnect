const mongoose = require('mongoose')
const env = require('../src/config/env')

async function inspectIndexes() {
  try {
    await mongoose.connect(env.MONGODB_URI)

    const collectionNames = [
      'courses',
      'courseofferings',
      'enrollments',
      'facultycourses',
    ]

    for (const name of collectionNames) {
      const exists = await mongoose.connection.db
        .listCollections({ name })
        .hasNext()

      console.log(`\n--- ${name} ---`)

      if (!exists) {
        console.log('Collection does not exist')
        continue
      }

      const indexes = await mongoose.connection.db.collection(name).indexes()

      console.dir(indexes, { depth: null })
    }

    const userCount = await mongoose.connection.db
      .collection('users')
      .countDocuments()

    console.log('\nExisting user count:', userCount)
  } finally {
    await mongoose.disconnect()
  }
}

inspectIndexes().catch((error) => {
  console.error('Inspection failed:', error.name)
  process.exitCode = 1
})
