const mongoose = require('mongoose')
const env = require('../src/config/env')
const User = require('../src/models/User')

async function inspectUserRoles() {
  try {
    await mongoose.connect(env.MONGODB_URI)

    const results = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])

    console.log('\n--- USER ROLE SUMMARY ---')
    console.table(results)
  } catch (error) {
    console.error('User inspection failed:', error.name)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

inspectUserRoles()
