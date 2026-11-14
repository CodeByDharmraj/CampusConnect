// Small helpers shared by page components that talk to the CampusConnect API.

export function authOptions(accessToken) {
  return { headers: { Authorization: `Bearer ${accessToken}` } }
}

export function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

export function formatDateTime(value) {
  if (!value) return 'Not specified'

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleString()
}

export function formatCourse(course) {
  if (!course) return 'Course unavailable'

  return [course.code, course.name].filter(Boolean).join(' — ') || 'Course'
}

export function formatOfferingTerm(offering) {
  if (!offering) return ''

  return `Semester ${offering.semester} · Section ${offering.section} · ${offering.academicYear}`
}

// Mongoose documents serialise users with `id`, lean queries with `_id`.
export function getId(record) {
  return record?._id ?? record?.id ?? ''
}
