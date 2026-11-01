const mongoose = require('mongoose')
const env = require('../src/config/env')
const Department = require('../src/models/Department')

async function inspectDepartments() {
  try {
    await mongoose.connect(env.MONGODB_URI)

    const departments = await Department.find({})
      .select('_id name code isActive')
      .sort({ name: 1 })
      .lean()

    console.log('\n--- ALL DEPARTMENTS ---')
    console.log(`Total departments: ${departments.length}`)

    if (departments.length === 0) {
      console.log('No department records exist.')
      return
    }

    for (const department of departments) {
      console.log({
        id: department._id.toString(),
        name: department.name,
        code: department.code,
        isActive: department.isActive,
      })
    }
  } catch (error) {
    console.error('Department inspection failed:', error.name)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

inspectDepartments()
