import { useState } from 'react'
import { Link } from 'react-router'

import {
  facultyDashboardData,
  studentDashboardData,
} from '../data/dashboardData'
import { useAuth } from '../context/useAuth'

const initialValues = {
  category: 'Academic',
  title: '',
  detail: '',
  courseReference: '',
}

const categories = ['Academic', 'Campus', 'Course update', 'Teaching']

const publishingConfig = {
  faculty: {
    scope: 'course',
    heading: 'Create a course announcement',
    description:
      'Prepare an announcement for a course assigned to you. Course assignment verification will be connected to the backend.',
    buttonLabel: 'Add course announcement to preview',
  },
  coordinator: {
    scope: 'department',
    heading: 'Create a department announcement',
    description: 'Prepare an announcement for your primary department.',
    buttonLabel: 'Add department announcement to preview',
  },
  admin: {
    scope: 'institution',
    heading: 'Create an institution-wide announcement',
    description: 'Prepare an announcement for the entire institution.',
    buttonLabel: 'Add institution announcement to preview',
  },
}

const roleLabels = {
  student: 'Student',
  faculty: 'Faculty',
  coordinator: 'Department Coordinator',
  admin: 'Administrator',
}

function getInitialAnnouncements(role) {
  if (role === 'faculty') {
    return facultyDashboardData.announcements
  }

  if (role === 'student') {
    return studentDashboardData.announcements
  }

  return []
}

function getScopeLabel(scope) {
  const labels = {
    course: 'Course',
    department: 'Department',
    institution: 'Institution',
  }

  return labels[scope] || 'Unknown'
}

export default function AnnouncementFormPage() {
  const { user } = useAuth()
  const role = user?.role
  const config = publishingConfig[role]

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [announcements, setAnnouncements] = useState(() =>
    getInitialAnnouncements(role),
  )
  const [feedback, setFeedback] = useState(null)

  const canPublish = Boolean(config)

  function handleChange(event) {
    const { name, value } = event.target

    setValues((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))

    setFeedback(null)
  }

  function validate() {
    const nextErrors = {}

    const title = values.title.trim()
    const detail = values.detail.trim()
    const courseReference = values.courseReference.trim()

    if (!title) {
      nextErrors.title = 'Enter an announcement title.'
    } else if (title.length < 5) {
      nextErrors.title = 'Use at least 5 characters.'
    } else if (title.length > 100) {
      nextErrors.title = 'Keep the title within 100 characters.'
    }

    if (!detail) {
      nextErrors.detail = 'Enter the announcement details.'
    } else if (detail.length < 10) {
      nextErrors.detail = 'Use at least 10 characters.'
    } else if (detail.length > 500) {
      nextErrors.detail = 'Keep the details within 500 characters.'
    }

    if (!categories.includes(values.category)) {
      nextErrors.category = 'Choose a valid category.'
    }

    if (role === 'faculty' && !courseReference) {
      nextErrors.courseReference =
        'Enter a course reference for this prototype preview.'
    }

    return nextErrors
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!canPublish) return

    const nextErrors = validate()
    setErrors(nextErrors)
    setFeedback(null)

    if (Object.values(nextErrors).some(Boolean)) return

    const newAnnouncement = {
      id: `demo-${Date.now()}`,
      category: values.category,
      title: values.title.trim(),
      detail: values.detail.trim(),
      scope: config.scope,
      scopeLabel: getScopeLabel(config.scope),
      target:
        role === 'faculty'
          ? values.courseReference.trim()
          : role === 'coordinator'
            ? user?.departmentId || 'Department not identified'
            : 'Entire institution',
      date: 'Just now · Local preview',
    }

    setAnnouncements((current) => [newAnnouncement, ...current])
    setValues(initialValues)
    setErrors({})
    setFeedback({
      type: 'success',
      message:
        'Added to the temporary local preview only. Nothing was published or saved to the database.',
    })
  }

  const fieldClass =
    'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
          CampusConnect · Academic communication
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Announcements
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          View campus updates and access announcement features according to your
          role.
        </p>

        <div className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Signed in as: {roleLabels[role] || 'Unknown role'}
        </div>
      </header>

      {canPublish ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {config.heading}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {config.description}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Publishing scope: {getScopeLabel(config.scope)}
            </p>

            {role === 'coordinator' && (
              <p className="mt-1 break-all text-xs text-blue-800 dark:text-blue-300">
                Department reference: {user?.departmentId || 'Not available'}
              </p>
            )}

            {role === 'admin' && (
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                Intended audience: Entire institution
              </p>
            )}

            {role === 'faculty' && (
              <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                Only courses assigned to the authenticated faculty member are
                valid publishing targets. Backend assignment verification is not
                implemented yet.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
            {role === 'faculty' && (
              <div>
                <label
                  htmlFor="announcement-course"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Course reference
                </label>

                <input
                  id="announcement-course"
                  name="courseReference"
                  value={values.courseReference}
                  onChange={handleChange}
                  placeholder="Prototype only — e.g. CSE301"
                  className={fieldClass}
                  aria-invalid={Boolean(errors.courseReference)}
                  aria-describedby={
                    errors.courseReference
                      ? 'announcement-course-error'
                      : undefined
                  }
                />

                {errors.courseReference && (
                  <p
                    id="announcement-course-error"
                    className="mt-2 text-sm text-red-700 dark:text-red-400"
                  >
                    {errors.courseReference}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  This is temporary preview text, not a verified course
                  assignment.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="announcement-category"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Category
              </label>

              <select
                id="announcement-category"
                name="category"
                value={values.category}
                onChange={handleChange}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={
                  errors.category ? 'announcement-category-error' : undefined
                }
                className={fieldClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {errors.category && (
                <p
                  id="announcement-category-error"
                  className="mt-2 text-sm text-red-700 dark:text-red-400"
                >
                  {errors.category}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="announcement-title"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Title
                </label>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {values.title.length}/100
                </span>
              </div>

              <input
                id="announcement-title"
                name="title"
                type="text"
                value={values.title}
                onChange={handleChange}
                maxLength={100}
                placeholder="e.g. Upcoming assessment schedule"
                className={fieldClass}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={
                  errors.title ? 'announcement-title-error' : undefined
                }
              />

              {errors.title && (
                <p
                  id="announcement-title-error"
                  className="mt-2 text-sm text-red-700 dark:text-red-400"
                >
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="announcement-detail"
                  className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Details
                </label>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {values.detail.length}/500
                </span>
              </div>

              <textarea
                id="announcement-detail"
                name="detail"
                rows={4}
                value={values.detail}
                onChange={handleChange}
                maxLength={500}
                placeholder="Provide the information readers need to know."
                className={fieldClass}
                aria-invalid={Boolean(errors.detail)}
                aria-describedby={
                  errors.detail ? 'announcement-detail-error' : undefined
                }
              />

              {errors.detail && (
                <p
                  id="announcement-detail-error"
                  className="mt-2 text-sm text-red-700 dark:text-red-400"
                >
                  {errors.detail}
                </p>
              )}
            </div>

            {feedback && (
              <p
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
              >
                {feedback.message}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                {config.buttonLabel}
              </button>

              <button
                type="button"
                onClick={() => {
                  setValues(initialValues)
                  setErrors({})
                  setFeedback(null)
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Clear form
              </button>
            </div>

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Prototype only. This form updates temporary React state. It does
              not publish an announcement or save anything to MongoDB.
            </p>
          </form>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Read-only announcement access
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Students can view announcements but cannot create or publish them.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Announcement preview
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {announcements.length} sample or local preview item
              {announcements.length === 1 ? '' : 's'}
            </p>
          </div>

          <Link
            to="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-blue-500 dark:text-blue-400"
          >
            Back to dashboard
          </Link>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          This feed currently uses sample data and local preview entries. It is
          not connected to the announcement backend.
        </p>

        {announcements.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            No sample announcements are available for this role yet.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {announcement.category}
                  </span>

                  {announcement.scopeLabel && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {announcement.scopeLabel}
                    </span>
                  )}

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {announcement.date}
                  </span>
                </div>

                <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                  {announcement.title}
                </h3>

                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {announcement.detail}
                </p>

                {announcement.target && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Preview target: {announcement.target}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
