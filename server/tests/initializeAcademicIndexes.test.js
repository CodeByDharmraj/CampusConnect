const test = require('node:test')
const assert = require('node:assert/strict')

const models = [
  require('../src/models/Course'),
  require('../src/models/CourseOffering'),
  require('../src/models/Enrollment'),
  require('../src/models/FacultyCourse'),
  require('../src/models/CourseOfferingReactivationRequest'),
  require('../src/models/TimetableEntry'),
  require('../src/models/Assignment'),
  require('../src/models/Submission'),
  require('../src/models/Announcement'),
  require('../src/models/AnnouncementRead'),
  require('../src/models/AttendanceSession'),
  require('../src/models/AttendanceRecord'),
  require('../src/models/AttendanceCorrectionRequest'),
]

const initializeAcademicIndexes = require('../src/config/initializeAcademicIndexes')

test('initializes all academic models', async () => {
  const expectedModels = [
    'Course',
    'CourseOffering',
    'Enrollment',
    'FacultyCourse',
    'CourseOfferingReactivationRequest',
    'TimetableEntry',
    'Assignment',
    'Submission',
    'Announcement',
    'AnnouncementRead',
    'AttendanceSession',
    'AttendanceRecord',
    'AttendanceCorrectionRequest',
  ]

  const initializedModels = []
  const originalInitMethods = models.map((model) => model.init)

  try {
    models.forEach((model) => {
      model.init = async () => {
        initializedModels.push(model.modelName)
      }
    })

    await initializeAcademicIndexes()

    assert.deepEqual(initializedModels, expectedModels)
  } finally {
    models.forEach((model, index) => {
      model.init = originalInitMethods[index]
    })
  }
})
