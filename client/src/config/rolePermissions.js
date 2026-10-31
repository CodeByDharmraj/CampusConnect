export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  COORDINATOR: 'coordinator',
  ADMIN: 'admin',
}

export const ALL_ROLES = Object.values(ROLES)

// Navigation visibility is a frontend convenience.
// Backend authorization remains the actual security boundary.
export const navigationPermissions = {
  dashboard: ALL_ROLES,
  courses: ALL_ROLES,
  timetable: ALL_ROLES,
  assignments: ALL_ROLES,
  attendance: ALL_ROLES,
  announcements: ALL_ROLES,
  clubsEvents: ALL_ROLES,
  grades: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN],
  submissions: [ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],
  facultyCourseManagement: [ROLES.COORDINATOR, ROLES.ADMIN],
  departmentManagement: [ROLES.ADMIN],
  facultyManagement: [ROLES.ADMIN],
  institutionalSettings: [ROLES.ADMIN],
}

// Timetable permissions.
export const timetablePermissions = {
  view: ALL_ROLES,
  create: [ROLES.ADMIN],
  update: [ROLES.ADMIN],
  delete: [ROLES.ADMIN],
}

// Course permissions.
export const coursePermissions = {
  view: ALL_ROLES,
  create: [ROLES.COORDINATOR, ROLES.ADMIN],
  update: [ROLES.COORDINATOR, ROLES.ADMIN],
  deactivate: [ROLES.COORDINATOR, ROLES.ADMIN],
  delete: [ROLES.ADMIN],
}

// Assignment permissions.
export const assignmentPermissions = {
  view: ALL_ROLES,
  create: [ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],
  update: [ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],
  delete: [ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],
  submit: [ROLES.STUDENT],
}

// Faculty-course assignment permissions.
export const facultyCoursePermissions = {
  view: [ROLES.COORDINATOR, ROLES.ADMIN],
  create: [ROLES.COORDINATOR, ROLES.ADMIN],
  update: [ROLES.COORDINATOR, ROLES.ADMIN],
  delete: [ROLES.ADMIN],
}

// Announcement permissions.
export const announcementPermissions = {
  view: ALL_ROLES,
  publishInstitution: [ROLES.ADMIN],
  publishDepartment: [ROLES.COORDINATOR, ROLES.ADMIN],
  publishCourse: [ROLES.FACULTY, ROLES.ADMIN],
}

// Account management permissions.
export const accountPermissions = {
  manageStudents: [ROLES.ADMIN],
  manageFaculty: [ROLES.ADMIN],
  manageCoordinators: [ROLES.ADMIN],
}

// Attendance permissions.
export const attendancePermissions = {
  viewOwn: [ROLES.STUDENT],
  viewAssignedCourses: [ROLES.FACULTY],
  viewDepartment: [ROLES.COORDINATOR],
  viewInstitution: [ROLES.ADMIN],
  mark: [ROLES.FACULTY],
  requestCorrection: [ROLES.STUDENT],
  approveCorrection: [ROLES.FACULTY],
}

// Grades and feedback permissions.
export const gradePermissions = {
  viewOwn: [ROLES.STUDENT],
  viewAssignedCourses: [ROLES.FACULTY],
  viewInstitution: [ROLES.ADMIN],
  manageAssignedCourses: [ROLES.FACULTY],
  manageInstitution: [ROLES.ADMIN],
}

// Submission permissions.
export const submissionPermissions = {
  submitOwn: [ROLES.STUDENT],
  viewOwn: [ROLES.STUDENT],
  reviewAssignedCourses: [ROLES.FACULTY],
  viewDepartment: [ROLES.COORDINATOR],
  viewInstitution: [ROLES.ADMIN],
  evaluateAssignedCourses: [ROLES.FACULTY],
}

// Clubs and events permissions.
export const clubsEventsPermissions = {
  view: ALL_ROLES,
  registerForEvents: [ROLES.STUDENT],
  manageAssignedClubs: [ROLES.COORDINATOR],
  manageDepartmentEvents: [ROLES.COORDINATOR],
  manageInstitution: [ROLES.ADMIN],
}

export function hasPermission(role, allowedRoles = []) {
  return allowedRoles.includes(role)
}
