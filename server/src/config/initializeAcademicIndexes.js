const Course = require('../models/Course')
const CourseOffering = require('../models/CourseOffering')
const Enrollment = require('../models/Enrollment')
const FacultyCourse = require('../models/FacultyCourse')
const CourseOfferingReactivationRequest = require('../models/CourseOfferingReactivationRequest')
const TimetableEntry = require('../models/TimetableEntry')
const Assignment = require('../models/Assignment')

const academicModels = [
  Course,
  CourseOffering,
  Enrollment,
  FacultyCourse,
  CourseOfferingReactivationRequest,
  TimetableEntry,
  Assignment,
]

// Wait for all academic models and their declared indexes to initialize.
async function initializeAcademicIndexes() {
  for (const model of academicModels) {
    await model.init()
    console.log(`Indexes initialized: ${model.modelName}`)
  }
}

module.exports = initializeAcademicIndexes
