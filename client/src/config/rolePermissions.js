export const ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  COORDINATOR: 'coordinator',
  ADMIN: 'admin',
}

// Navigation visibility is separate from backend authorization.
// All authenticated roles can view the timetable.
export const navigationPermissions = {
  dashboard: [ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],

  courses: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN],

  timetable: [ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],

  assignments: [ROLES.STUDENT, ROLES.FACULTY],

  attendance: [ROLES.STUDENT, ROLES.FACULTY, ROLES.ADMIN],

  announcements: [ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],

  clubsEvents: [ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR],
}

// Timetable management permissions.
export const timetablePermissions = {
  view: [ROLES.STUDENT, ROLES.FACULTY, ROLES.COORDINATOR, ROLES.ADMIN],

  create: [ROLES.ADMIN],
  update: [ROLES.ADMIN],
  delete: [ROLES.ADMIN],
}

export function hasPermission(role, allowedRoles = []) {
  return allowedRoles.includes(role)
}
