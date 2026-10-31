const test = require('node:test')
const assert = require('node:assert/strict')

const initializeAcademicIndexes = require('../src/config/initializeAcademicIndexes')

const models = [
  require('../src/models/Course'),
  require('../src/models/CourseOffering'),
  require('../src/models/Enrollment'),
  require('../src/models/FacultyCourse'),
  require('../src/models/CourseOfferingReactivationRequest'),
]

test('initializes all five academic models', async () => {
  const expectedModels = [
    'Course',
    'CourseOffering',
    'Enrollment',
    'FacultyCourse',
    'CourseOfferingReactivationRequest',
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
