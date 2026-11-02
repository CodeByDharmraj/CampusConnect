import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  Users,
  Bell,
  Percent,
  CalendarClock,
  ClipboardCheck,
  Trophy,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function getAuthOptions(accessToken) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
}

function formatDate(value) {
  if (!value) return 'No deadline set'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Invalid deadline'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getCourseName(assignment) {
  return (
    assignment.courseOfferingId?.courseId?.name ||
    'Course information unavailable'
  )
}

function getCourseCode(assignment) {
  return assignment.courseOfferingId?.courseId?.code || ''
}

function SectionError({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
    >
      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
        Could not load this section.
      </p>

      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
        {error?.message || 'An unexpected error occurred.'}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        <RefreshCw size={15} aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}

function SectionLoading() {
  return (
    <div role="status" aria-label="Loading section" className="space-y-3">
      <span className="sr-only">Loading...</span>
      <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}

const DASHBOARD_METRIC_ICONS = {
  enrolledCourses: BookOpen,
  attendance: Percent,
  openAssignments: ClipboardList,
  unreadAnnouncements: Bell,
  upcomingEvents: CalendarDays,
  assignedCourses: BookOpen,
  students: Users,
  pendingReviews: ClipboardCheck,
  attendanceSessions: CalendarClock,
  departmentStudents: Users,
  departmentFaculty: Users,
  activeClubs: Trophy,
  eventRegistrations: ClipboardCheck,
  activeOfferings: BookOpen,
  faculty: Users,
  coordinators: Users,
  departments: Building2,
  courses: BookOpen,
  courseOfferings: BookOpen,
}

function DashboardCard({ label, value, description, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
    </article>
  )
}

function DashboardSection({ title, children, action }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        {action}
      </div>

      {children}
    </section>
  )
}

function CoursesSection({ query }) {
  if (query.isPending) return <SectionLoading />

  if (query.isError) {
    return <SectionError error={query.error} onRetry={() => query.refetch()} />
  }

  const courses = query.data?.data?.courses ?? []

  if (courses.length === 0) {
    return (
      <EmptyState message="No courses are currently available in your permitted view." />
    )
  }

  return (
    <div className="space-y-3">
      {courses.slice(0, 5).map((course) => (
        <article
          key={course._id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <BookOpen size={19} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 dark:text-white">
              {course.name}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {course.code} · {course.credits} credits
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              course.isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {course.isActive ? 'Active' : 'Inactive'}
          </span>
        </article>
      ))}

      {courses.length > 5 && (
        <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
          Showing 5 of {courses.length} visible courses.
        </p>
      )}
    </div>
  )
}

function AssignmentsSection({ query, role }) {
  if (query.isPending) return <SectionLoading />

  if (query.isError) {
    return <SectionError error={query.error} onRetry={() => query.refetch()} />
  }

  const assignments = query.data?.data?.assignments ?? []

  if (assignments.length === 0) {
    return (
      <EmptyState message="No assignments are available in your permitted view." />
    )
  }

  return (
    <div className="space-y-3">
      {assignments.slice(0, 5).map((assignment) => (
        <article
          key={assignment._id}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white">
                {assignment.title}
              </p>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {getCourseName(assignment)}
                {getCourseCode(assignment)
                  ? ` (${getCourseCode(assignment)})`
                  : ''}
              </p>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Due: {formatDate(assignment.dueDate)}
              </p>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {assignment.status}
            </span>
          </div>
        </article>
      ))}

      {assignments.length > 5 && (
        <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
          Showing 5 of {assignments.length} visible assignments.
        </p>
      )}

      {role === 'student' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          These are published assignments visible to your enrolled courses.
        </p>
      )}
    </div>
  )
}

function TimetableSection({ query }) {
  if (query.isPending) return <SectionLoading />

  if (query.isError) {
    return <SectionError error={query.error} onRetry={() => query.refetch()} />
  }

  const entries = query.data?.data?.entries ?? []

  if (entries.length === 0) {
    return <EmptyState message="No active timetable entries are available." />
  }

  return (
    <div className="space-y-3">
      {entries.slice(0, 6).map((entry) => {
        const courseOffering = entry.courseOfferingId
        const course = courseOffering?.courseId

        return (
          <article
            key={entry._id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {course?.name || 'Course information unavailable'}
                </p>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {DAY_NAMES[entry.dayOfWeek] || 'Day unavailable'}
                  {' · '}
                  {entry.startTime}–{entry.endTime}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Room: {entry.room}
                  {' · '}
                  {entry.mode}
                </p>
              </div>

              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
          </article>
        )
      })}

      {entries.length > 6 && (
        <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
          Showing 6 of {entries.length} active timetable entries.
        </p>
      )}
    </div>
  )
}

function DepartmentsSection({ query }) {
  if (query.isPending) return <SectionLoading />

  if (query.isError) {
    return <SectionError error={query.error} onRetry={() => query.refetch()} />
  }

  const departments = query.data?.data?.departments ?? []

  if (departments.length === 0) {
    return (
      <EmptyState message="No departments are available in your permitted view." />
    )
  }

  return (
    <div className="space-y-3">
      {departments.slice(0, 5).map((department) => (
        <article
          key={department._id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Building2 size={19} aria-hidden="true" />
          </span>

          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {department.name}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {department.code}
            </p>
          </div>
        </article>
      ))}

      {departments.length > 5 && (
        <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
          Showing 5 of {departments.length} visible departments.
        </p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, accessToken, isLoading: isAuthLoading } = useAuth()

  const role = user?.role
  const canViewDepartments = ['admin', 'coordinator'].includes(role)

  const queryOptions = {
    enabled: Boolean(accessToken) && !isAuthLoading,
  }

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', accessToken],
    queryFn: () => apiClient.get('/dashboard/summary', getAuthOptions(accessToken)),
    ...queryOptions,
  })

  const coursesQuery = useQuery({
    queryKey: ['dashboard', 'courses', accessToken],
    queryFn: () => apiClient.get('/courses', getAuthOptions(accessToken)),
    ...queryOptions,
  })

  const assignmentsQuery = useQuery({
    queryKey: ['dashboard', 'assignments', accessToken],
    queryFn: () => apiClient.get('/assignments', getAuthOptions(accessToken)),
    ...queryOptions,
  })

  const timetableQuery = useQuery({
    queryKey: ['dashboard', 'timetable', accessToken],
    queryFn: () => apiClient.get('/timetable', getAuthOptions(accessToken)),
    ...queryOptions,
  })

  const departmentsQuery = useQuery({
    queryKey: ['dashboard', 'departments', accessToken],
    queryFn: () => apiClient.get('/departments', getAuthOptions(accessToken)),
    enabled: queryOptions.enabled && canViewDepartments,
  })

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-7xl p-8 text-sm text-slate-500">
        Loading your account...
      </div>
    )
  }

  const dashboardMetrics = summaryQuery.data?.data?.summary?.metrics ?? []
  const stats = dashboardMetrics.map((item) => ({
    label: item.label,
    value: item.value,
    description: item.description,
    icon: DASHBOARD_METRIC_ICONS[item.key] || ClipboardList,
  }))

  const displayName = user?.name || user?.email || 'there'
  const greeting = `Welcome, ${displayName}`

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-2xl border border-blue-200 bg-linear-to-br from-white to-blue-50 p-6 dark:border-blue-950 dark:from-slate-900 dark:to-blue-950/40 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
          CampusConnect · Dashboard
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {greeting}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Here is your campus overview, based on the information available to
          your account.
        </p>

        <span className="mt-4 inline-flex rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-blue-800 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300">
          {role || 'User'}
        </span>
      </header>

      <section aria-label="Dashboard summary">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          At a glance
        </h2>

        {summaryQuery.isError ? (
          <SectionError error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryQuery.isPending
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
                ))
              : stats.map((stat) => <DashboardCard key={stat.label} {...stat} />)}
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <DashboardSection title="Courses">
          <CoursesSection query={coursesQuery} />
        </DashboardSection>

        <DashboardSection
          title="Assignments"
          action={
            <Link
              to="/assignments"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400"
            >
              View all
            </Link>
          }
        >
          <AssignmentsSection query={assignmentsQuery} role={role} />
        </DashboardSection>
      </div>

      <DashboardSection
        title="Timetable"
        action={
          <Link
            to="/timetable"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400"
          >
            View timetable
          </Link>
        }
      >
        <TimetableSection query={timetableQuery} />
      </DashboardSection>

      {canViewDepartments && (
        <DashboardSection title="Departments">
          <DepartmentsSection query={departmentsQuery} />
        </DashboardSection>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Dashboard information is retrieved from the CampusConnect API and
        limited by your account permissions.
      </p>
    </div>
  )
}
