import { useState } from 'react'
import { Link } from 'react-router'
import { studentDashboardData } from '../data/dashboardData'

const initialValues = {
  category: 'Academic',
  title: '',
  detail: '',
}

const categories = ['Academic', 'Campus', 'Course update', 'Teaching']

export default function AnnouncementFormPage() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [announcements, setAnnouncements] = useState(
    studentDashboardData.announcements,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target

    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function validate() {
    const nextErrors = {}
    const title = values.title.trim()
    const detail = values.detail.trim()

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

    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const nextErrors = validate()
    setErrors(nextErrors)
    setFeedback(null)

    if (Object.values(nextErrors).some(Boolean)) return

    setIsSubmitting(true)

    try {
      // Simulates submission latency; no API request or database write occurs.
      await new Promise((resolve) => setTimeout(resolve, 400))

      const newAnnouncement = {
        id: `demo-${Date.now()}`,
        category: values.category,
        title: values.title.trim(),
        detail: values.detail.trim(),
        date: 'Just now · Demo',
      }

      setAnnouncements((current) => [newAnnouncement, ...current])
      setValues(initialValues)
      setErrors({})
      setFeedback({
        type: 'success',
        message: 'Announcement added to this page’s temporary preview.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'The demo submission failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass =
    'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
          CampusConnect · Phase 10
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Announcements
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Create a sample announcement and see React state update the list. This
          prototype does not publish a real campus notice.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Create an announcement
        </h2>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? 'announcement-title-error' : undefined
              }
              placeholder="e.g. Upcoming assessment schedule"
              className={fieldClass}
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
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.detail)}
              aria-describedby={
                errors.detail ? 'announcement-detail-error' : undefined
              }
              placeholder="Provide the information students need to know."
              className={fieldClass}
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
              className={
                feedback.type === 'error'
                  ? 'rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                  : 'rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              }
            >
              {feedback.message}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
            >
              {isSubmitting ? 'Adding announcement…' : 'Add announcement'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setValues(initialValues)
                setErrors({})
                setFeedback(null)
              }}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear form
            </button>
          </div>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Demo only. New announcements exist in this page’s React state and
            will disappear on refresh.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Announcement preview
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {announcements.length} item
              {announcements.length === 1 ? '' : 's'} in this local preview
            </p>
          </div>
          <Link
            to="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-blue-500 dark:text-blue-400"
          >
            Back to dashboard
          </Link>
        </div>

        {announcements.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            No announcements yet. Add one using the form above.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="py-4 first:pt-0 last:pb-0">
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
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {announcement.detail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
