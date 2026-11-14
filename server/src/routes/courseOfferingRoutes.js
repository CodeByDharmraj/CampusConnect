const express = require('express')

const authenticate = require('../middleware/authenticate')
const authorizeRoles = require('../middleware/authorizeRoles')

const courseOfferingController = require('../controllers/courseOfferingController')
const { ROLES } = require('../constants/roles')

const router = express.Router()

router.use(authenticate)

// Return active offerings and faculty accounts for assignment management.
router.get(
  '/options',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.getFacultyAssignmentOptions,
)

// List offerings (including inactive ones) within the caller's scope.
router.get(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.getCourseOfferings,
)

// Reactivation requests are declared before the /:offeringId routes.
router.get(
  '/reactivation-requests',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.getReactivationRequests,
)

router.patch(
  '/reactivation-requests/:requestId/approve',
  authorizeRoles(ROLES.ADMIN),
  courseOfferingController.approveReactivationRequest,
)

router.patch(
  '/reactivation-requests/:requestId/reject',
  authorizeRoles(ROLES.ADMIN),
  courseOfferingController.rejectReactivationRequest,
)

// Create a new offering for an active course.
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.createCourseOffering,
)

// Deactivate an offering without deleting its history.
router.patch(
  '/:offeringId/deactivate',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.deactivateCourseOffering,
)

// A coordinator asks an administrator to reactivate an inactive offering.
router.post(
  '/:offeringId/reactivation-requests',
  authorizeRoles(ROLES.COORDINATOR),
  courseOfferingController.createReactivationRequest,
)

// Assign a faculty member to an active course offering.
router.post(
  '/:offeringId/faculty',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.createFacultyAssignment,
)

// List assignments for an offering.
// Administrators and coordinators see history; faculty see their own active assignment.
router.get(
  '/:offeringId/faculty',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR, ROLES.FACULTY),
  courseOfferingController.getFacultyAssignments,
)

// Deactivate an assignment without deleting its history.
router.delete(
  '/:offeringId/faculty/:facultyId',
  authorizeRoles(ROLES.ADMIN, ROLES.COORDINATOR),
  courseOfferingController.deactivateFacultyAssignment,
)

module.exports = router
