const test = require('node:test')

const assert = require('node:assert/strict')

const mongoose = require('mongoose')

const { randomUUID } = require('node:crypto')

const { MongoMemoryReplSet } = require('mongodb-memory-server')

const Department = require('../src/models/Department')

const User = require('../src/models/User')

const Course = require('../src/models/Course')

const CourseOffering = require('../src/models/CourseOffering')

const CourseOfferingReactivationRequest = require('../src/models/CourseOfferingReactivationRequest')

const {
  approveReactivationRequest,
  rejectReactivationRequest,
} = require('../src/services/courseOfferingReactivationService')

const enabled = process.env.RUN_REACTIVATION_INTEGRATION_TESTS === 'true'

test(
  'course offering reactivation transaction integration tests',
  { skip: !enabled },
  async (t) => {
    const replicaSet = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
      },
    })

    try {
      await mongoose.connect(replicaSet.getUri(), {
        dbName: 'campusconnect_reactivation_test',
        serverSelectionTimeoutMS: 10000,
      })

      assert.equal(
        mongoose.connection.name,
        'campusconnect_reactivation_test',
        'Tests must use the isolated in-memory database.',
      )

      const models = [
        Department,
        User,
        Course,
        CourseOffering,
        CourseOfferingReactivationRequest,
      ]

      await Promise.all(models.map((model) => model.init()))

      async function createFixture() {
        const uniqueId = randomUUID()

        const department = await Department.create({
          name: `Reactivation Test Department ${uniqueId}`,
          code: `RT-${uniqueId.replace(/-/g, '').slice(0, 8)}`,
          isActive: true,
        })

        const coordinator = await User.create({
          name: 'Integration Test Coordinator',
          email: `coordinator-${uniqueId}@example.test`,
          passwordHash: 'integration-test-password-hash',
          role: 'coordinator',
          departmentId: department._id,
          isActive: true,
        })

        const administrator = await User.create({
          name: 'Integration Test Administrator',
          email: `admin-${uniqueId}@example.test`,
          passwordHash: 'integration-test-password-hash',
          role: 'admin',
          isActive: true,
        })

        const course = await Course.create({
          name: 'Integration Test Course',
          code: `IT-${uniqueId.replace(/-/g, '').slice(0, 8)}`,
          departmentId: department._id,
          credits: 3,
          isActive: true,
        })

        const offering = await CourseOffering.create({
          courseId: course._id,
          academicYear: '2026-2027',
          semester: 5,
          section: 'A',
          isActive: false,
        })

        const request = await CourseOfferingReactivationRequest.create({
          courseOfferingId: offering._id,
          requestedBy: coordinator._id,
          requestReason:
            'The department requires this offering for continuing students.',
          status: 'pending',
        })

        return {
          administrator,
          offering,
          request,
        }
      }

      t.after(async () => {
        try {
          if (mongoose.connection.readyState === 1) {
            await mongoose.connection.dropDatabase()
          }
        } finally {
          try {
            await mongoose.disconnect()
          } finally {
            await replicaSet.stop()
          }
        }
      })

      await t.test(
        'approves a pending request and persists the offering reactivation',
        async () => {
          const fixture = await createFixture()

          const result = await approveReactivationRequest(
            fixture.administrator,
            fixture.request._id.toString(),
            'The department has confirmed the academic requirement.',
          )

          assert.equal(result.status, 'approved')

          assert.equal(
            result.decidedBy.toString(),
            fixture.administrator._id.toString(),
          )

          assert.ok(result.decidedAt instanceof Date)

          const persistedOffering = await CourseOffering.findById(
            fixture.offering._id,
          )

          const persistedRequest =
            await CourseOfferingReactivationRequest.findById(
              fixture.request._id,
            )

          assert.equal(persistedOffering.isActive, true)
          assert.equal(persistedRequest.status, 'approved')

          assert.equal(
            persistedRequest.decidedBy.toString(),
            fixture.administrator._id.toString(),
          )
        },
      )

      await t.test(
        'rejects a pending request without activating its offering',
        async () => {
          const fixture = await createFixture()

          const result = await rejectReactivationRequest(
            fixture.administrator,
            fixture.request._id.toString(),
            'The academic requirement is not approved at this time.',
          )

          assert.equal(result.status, 'rejected')
          assert.ok(result.decidedAt instanceof Date)

          const persistedOffering = await CourseOffering.findById(
            fixture.offering._id,
          )

          const persistedRequest =
            await CourseOfferingReactivationRequest.findById(
              fixture.request._id,
            )

          assert.equal(persistedOffering.isActive, false)
          assert.equal(persistedRequest.status, 'rejected')

          assert.equal(
            persistedRequest.decidedBy.toString(),
            fixture.administrator._id.toString(),
          )
        },
      )

      await t.test(
        'rolls back offering reactivation if saving the request fails',
        async (subtest) => {
          const fixture = await createFixture()

          const databaseError = new Error(
            'Simulated reactivation request save failure.',
          )

          subtest.mock.method(
            CourseOfferingReactivationRequest.prototype,
            'save',
            async function failRequestSave() {
              throw databaseError
            },
          )

          await assert.rejects(
            approveReactivationRequest(
              fixture.administrator,
              fixture.request._id.toString(),
              'The department has confirmed the academic requirement.',
            ),
            (error) => error === databaseError,
          )

          const persistedOffering = await CourseOffering.findById(
            fixture.offering._id,
          )

          const persistedRequest =
            await CourseOfferingReactivationRequest.findById(
              fixture.request._id,
            )

          assert.equal(
            persistedOffering.isActive,
            false,
            'The offering update must be rolled back.',
          )

          assert.equal(
            persistedRequest.status,
            'pending',
            'The request must remain pending after rollback.',
          )

          assert.equal(
            persistedRequest.decidedBy,
            null,
            'The administrator decision must not be persisted.',
          )

          assert.equal(
            persistedRequest.decidedAt,
            null,
            'The decision timestamp must not be persisted.',
          )
        },
      )

      await t.test(
        'allows only one administrator decision for concurrent approvals',
        async () => {
          const fixture = await createFixture()

          const results = await Promise.allSettled([
            approveReactivationRequest(
              fixture.administrator,
              fixture.request._id.toString(),
              'The department has confirmed the academic requirement.',
            ),
            approveReactivationRequest(
              fixture.administrator,
              fixture.request._id.toString(),
              'The department has confirmed the academic requirement.',
            ),
          ])

          const successfulDecisions = results.filter(
            (result) => result.status === 'fulfilled',
          )

          const failedDecisions = results.filter(
            (result) => result.status === 'rejected',
          )

          assert.equal(successfulDecisions.length, 1)
          assert.equal(failedDecisions.length, 1)

          assert.equal(failedDecisions[0].reason.statusCode, 409)

          assert.equal(
            failedDecisions[0].reason.code,
            'REACTIVATION_REQUEST_ALREADY_DECIDED',
          )

          const persistedOffering = await CourseOffering.findById(
            fixture.offering._id,
          )

          const persistedRequest =
            await CourseOfferingReactivationRequest.findById(
              fixture.request._id,
            )

          assert.equal(persistedOffering.isActive, true)
          assert.equal(persistedRequest.status, 'approved')
        },
      )

      await t.test(
        'allows only one decision when approval and rejection happen concurrently',
        async () => {
          const fixture = await createFixture()

          const results = await Promise.allSettled([
            approveReactivationRequest(
              fixture.administrator,
              fixture.request._id.toString(),
              'The department has confirmed the academic requirement.',
            ),
            rejectReactivationRequest(
              fixture.administrator,
              fixture.request._id.toString(),
              'The academic requirement is not approved at this time.',
            ),
          ])

          const successfulDecisions = results.filter(
            (result) => result.status === 'fulfilled',
          )

          const failedDecisions = results.filter(
            (result) => result.status === 'rejected',
          )

          assert.equal(
            successfulDecisions.length,
            1,
            'Exactly one administrator decision must succeed.',
          )

          assert.equal(
            failedDecisions.length,
            1,
            'The competing administrator decision must fail.',
          )

          assert.equal(failedDecisions[0].reason.statusCode, 409)

          assert.equal(
            failedDecisions[0].reason.code,
            'REACTIVATION_REQUEST_ALREADY_DECIDED',
          )

          const persistedOffering = await CourseOffering.findById(
            fixture.offering._id,
          )

          const persistedRequest =
            await CourseOfferingReactivationRequest.findById(
              fixture.request._id,
            )

          assert.ok(
            ['approved', 'rejected'].includes(persistedRequest.status),
            'The request must have exactly one final decision.',
          )

          assert.equal(
            persistedOffering.isActive,
            persistedRequest.status === 'approved',
            'The offering state must agree with the winning decision.',
          )

          assert.equal(
            persistedRequest.decidedBy.toString(),
            fixture.administrator._id.toString(),
          )

          assert.ok(persistedRequest.decidedAt instanceof Date)

          const expectedReason =
            persistedRequest.status === 'approved'
              ? 'The department has confirmed the academic requirement.'
              : 'The academic requirement is not approved at this time.'

          assert.equal(
            persistedRequest.decisionReason,
            expectedReason,
            'The winning decision reason must be preserved.',
          )
        },
      )
    } catch (error) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect()
      }

      await replicaSet.stop()

      throw error
    }
  },
)
