import { useState } from 'react'
import { NavLink } from 'react-router'
import {
  facultyDashboardData,
  studentDashboardData,
} from '../data/dashboardData'

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
]

const stateOptions = [
  { value: 'populated', label: 'Populated' },
  { value: 'empty', label: 'Empty' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
]

const statColors = [
  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
]

function SectionHeading({ title, to, linkLabel = 'View all' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      {to && (
        <NavLink
          to={to}
          className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {linkLabel}
        </NavLink>
      )}
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        —
      </div>
      <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div
      aria-label="Loading dashboard preview"
      role="status"
      className="space-y-5"
    >
      <span className="sr-only">Loading dashboard preview…</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-8 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-5 h-20 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-3 h-20 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40"
    >
      <p className="font-semibold text-red-800 dark:text-red-300">
        Dashboard preview unavailable
      </p>
      <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
        This is a demonstration of an error state. No live API request was made.
        Switch back to the populated preview to continue.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-red-500"
      >
        Return to populated preview
      </button>
    </div>
  )
}

function StatCard({ stat, index }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-slate-600 dark:text-slate-400">
          {stat.label}
        </p>
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${statColors[index % statColors.length]}`}
        >
          {index + 1}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {stat.value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {stat.note}
      </p>
    </article>
  )
}

function CourseList({ courses, empty = false }) {
  if (empty || courses.length === 0) {
    return (
      <EmptyState
        title="No courses to display"
        description="Course information will appear here when it is available."
      />
    )
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <article
          key={course.code}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {course.code.slice(-3)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-white">
                {course.name}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {course.code}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-label={`${course.name} illustrative progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={course.progress}
                >
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                  {course.progress}%
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function AssignmentList({ assignments, empty = false }) {
  if (empty || assignments.length === 0) {
    return (
      <EmptyState
        title="Nothing pending"
        description="There are no items in this preview. New items will appear here when available."
      />
    )
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <article
          key={assignment.id}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {assignment.title}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {assignment.course}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {assignment.due}
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {assignment.status}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function AnnouncementList({ announcements, empty = false }) {
  if (empty || announcements.length === 0) {
    return (
      <EmptyState
        title="No announcements yet"
        description="Relevant academic and campus announcements will appear here."
      />
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {announcements.map((announcement) => (
        <article key={announcement.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {announcement.category}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {announcement.date}
            </span>
          </div>
          <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
            {announcement.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {announcement.detail}
          </p>
        </article>
      ))}
    </div>
  )
}

export default function DashboardPrototypePage() {
  const [role, setRole] = useState('student')
  const [previewState, setPreviewState] = useState('populated')

  const data = role === 'student' ? studentDashboardData : facultyDashboardData
  const isEmpty = previewState === 'empty'

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-white to-blue-50 p-6 dark:border-blue-950 dark:from-slate-900 dark:to-blue-950/40 sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              CampusConnect · Dashboard preview
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {data.greeting}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {data.description}
            </p>
            <p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Demo only — all figures and records are illustrative
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-80">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Role preview
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-800 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              UI state preview
              <select
                value={previewState}
                onChange={(event) => setPreviewState(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-800 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {previewState === 'loading' ? (
        <LoadingState />
      ) : previewState === 'error' ? (
        <ErrorState onRetry={() => setPreviewState('populated')} />
      ) : (
        <>
          <section aria-label="Dashboard summary">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                At a glance
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isEmpty ? 'Empty state preview' : 'Sample summary'}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(isEmpty
                ? data.stats.map((stat) => ({ ...stat, value: '—' }))
                : data.stats
              ).map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} />
              ))}
            </div>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <SectionHeading title="Courses" to="/courses" />
              <div className="mt-5">
                <CourseList courses={data.courses} empty={isEmpty} />
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <SectionHeading
                title={
                  role === 'student' ? 'Upcoming assignments' : 'Teaching tasks'
                }
                to="/assignments"
              />
              <div className="mt-5">
                <AssignmentList
                  assignments={data.assignments}
                  empty={isEmpty}
                />
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <SectionHeading title="Recent announcements" to="/announcements" />
            <div className="mt-5">
              <AnnouncementList
                announcements={data.announcements}
                empty={isEmpty}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
            <h2 className="font-bold text-slate-900 dark:text-white">
              Continue exploring
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <NavLink
                to="/timetable"
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-blue-500"
              >
                View timetable
              </NavLink>
              <NavLink
                to="/attendance"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View attendance
              </NavLink>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
