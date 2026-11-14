// Single source of truth for user roles. Import these instead of repeating
// raw strings such as 'admin' across routes, middleware and validation.
const ROLES = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  COORDINATOR: 'coordinator',
  ADMIN: 'admin',
})

const ROLE_VALUES = Object.freeze(Object.values(ROLES))

// Roles that must always belong to a primary department.
const DEPARTMENT_REQUIRED_ROLES = Object.freeze([
  ROLES.STUDENT,
  ROLES.COORDINATOR,
])

module.exports = {
  ROLES,
  ROLE_VALUES,
  DEPARTMENT_REQUIRED_ROLES,
}
