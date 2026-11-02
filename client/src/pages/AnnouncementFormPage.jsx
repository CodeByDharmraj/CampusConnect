import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const categories = ['Academic', 'Campus', 'Course update', 'Teaching']

const roleLabels = {
  student: 'Student',
  faculty: 'Faculty',
  coordinator: 'Department Coordinator',
  admin: 'Administrator',
}

const scopeLabels = {
  institution: 'Institution-wide',
  department: 'Department',
  course: 'Course',
}

function getAuthOptions(accessToken) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
}

function formatDate(value) {
  if (!value) return 'Recently published'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently published'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function AnnouncementCard({ announcement, role, onMarkRead, markingId }) {
  const isStudent = role === 'student'

  return (
    <article className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {announcement.category}
        </span>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {scopeLabels[announcement.scope] || announcement.scope}
        </span>

        {isStudent && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              announcement.isRead
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {announcement.isRead ? 'Read' : 'Unread'}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        {announcement.title}
      </h3>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
        {announcement.detail}
      </p>

      <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Published: {formatDate(announcement.publishedAt)}</span>

        {announcement.authorId?.name && (
          <span>By {announcement.authorId.name}</span>
        )}
      </div>

      {announcement.expiresAt && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Available until: {formatDate(announcement.expiresAt)}
        </p>
      )}

      {isStudent && announcement.isRead && announcement.readAt && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          Read on: {formatDate(announcement.readAt)}
        </p>
      )}

      {isStudent && !announcement.isRead && (
        <button
          type="button"
          disabled={markingId === announcement._id}
          onClick={() => onMarkRead(announcement._id)}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {markingId === announcement._id ? 'Marking...' : 'Mark as read'}
        </button>
      )}
    </article>
  )
}

export default function AnnouncementFormPage() {
  const { user, accessToken } = useAuth()
  const role = user?.role

  const queryClient = useQueryClient()

  const canPublish = ['admin', 'coordinator', 'faculty'].includes(role)

  const [values, setValues] = useState({
    category: 'Academic',
    title: '',
    detail: '',
    courseOfferingId: '',
    expiresAt: '',
  })

  const [feedback, setFeedback] = useState(null)
  const [markingId, setMarkingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const authOptions = getAuthOptions(accessToken)

  // Fetch announcements visible to the authenticated user.
  const announcementsQuery = useQuery({
    queryKey: ['announcements', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/announcements', authOptions)

      return response.data.data.announcements
    },
    enabled: Boolean(accessToken),
  })

  // Faculty can only select their assigned course offerings.
  const optionsQuery = useQuery({
    queryKey: ['announcement-options', accessToken],
    queryFn: async () => {
      const response = await apiClient.get(
        '/announcements/options',
        authOptions,
      )

      return response.data.data.courseOfferings
    },
    enabled: Boolean(accessToken) && role === 'faculty',
  })

  // Publish announcement.
  const publishMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(
        '/announcements',
        payload,
        authOptions,
      )

      return response.data
    },

    onSuccess: async () => {
      setValues({
        category: 'Academic',
        title: '',
        detail: '',
        courseOfferingId: '',
        expiresAt: '',
      })

      setFeedback({
        type: 'success',
        message: 'Announcement published successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['announcements'],
      })
    },

    onError: (error) => {
      setFeedback({
        type: 'error',
        message:
          error.response?.data?.message ||
          'Unable to publish the announcement. Please try again.',
      })
    },
  })

  // Mark a student announcement as read.
  async function handleMarkRead(announcementId) {
    setMarkingId(announcementId)
    setFeedback(null)

    try {
      await apiClient.patch(
        `/announcements/${announcementId}/read`,
        {},
        authOptions,
      )

      await queryClient.invalidateQueries({
        queryKey: ['announcements'],
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error.response?.data?.message || 'Unable to update the read status.',
      })
    } finally {
      setMarkingId(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    const title = values.title.trim()
    const detail = values.detail.trim()

    if (title.length < 5) {
      setFeedback({
        type: 'error',
        message: 'Title must contain at least 5 characters.',
      })
      return
    }

    if (title.length > 100) {
      setFeedback({
        type: 'error',
        message: 'Title cannot exceed 100 characters.',
      })
      return
    }

    if (detail.length < 10) {
      setFeedback({
        type: 'error',
        message: 'Details must contain at least 10 characters.',
      })
      return
    }

    if (detail.length > 5000) {
      setFeedback({
        type: 'error',
        message: 'Details cannot exceed 5000 characters.',
      })
      return
    }

    if (role === 'faculty' && !values.courseOfferingId) {
      setFeedback({
        type: 'error',
        message: 'Select one of your assigned course offerings.',
      })
      return
    }

    const payload = {
      title,
      detail,
      category: values.category,
    }

    if (role === 'faculty') {
      payload.courseOfferingId = values.courseOfferingId
    }

    if (values.expiresAt) {
      const expiry = new Date(values.expiresAt)

      if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
        setFeedback({
          type: 'error',
          message: 'Choose a valid future expiry date.',
        })
        return
      }

      payload.expiresAt = expiry.toISOString()
    }

    publishMutation.mutate(payload)
  }

  const fieldClass =
    'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

  const announcements = announcementsQuery.data ?? []
  const courseOfferings = optionsQuery.data ?? []
  const unreadCount = announcements.filter(
    (announcement) => role === 'student' && !announcement.isRead,
  ).length

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      !normalizedSearch ||
      [announcement.title, announcement.detail, announcement.authorId?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))

    const matchesCategory =
      categoryFilter === 'all' || announcement.category === categoryFilter

    const matchesUnread =
      !unreadOnly || (role === 'student' && !announcement.isRead)

    return matchesSearch && matchesCategory && matchesUnread
  })

  const hasActiveFilters =
    Boolean(searchTerm) || categoryFilter !== 'all' || unreadOnly

  function clearFeedFilters() {
    setSearchTerm('')
    setCategoryFilter('all')
    setUnreadOnly(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
          CampusConnect · Academic communication
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Announcements
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          View and publish announcements according to your authorized role.
        </p>

        <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Signed in as: {roleLabels[role] || 'Unknown role'}
        </span>
      </header>

      {canPublish && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Publish announcement
          </h2>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your publishing scope is determined by your authenticated role.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="announcement-category"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Category
              </label>

              <select
                id="announcement-category"
                value={values.category}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className={fieldClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {role === 'faculty' && (
              <div>
                <label
                  htmlFor="announcement-course"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Assigned course offering
                </label>

                <select
                  id="announcement-course"
                  value={values.courseOfferingId}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      courseOfferingId: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  disabled={optionsQuery.isPending || optionsQuery.isError}
                >
                  <option value="">
                    {optionsQuery.isPending
                      ? 'Loading assigned courses...'
                      : 'Select a course offering'}
                  </option>

                  {courseOfferings.map((offering) => (
                    <option key={offering._id} value={offering._id}>
                      {offering.courseId?.code} — {offering.courseId?.name} (
                      {offering.academicYear}, Semester {offering.semester},
                      Section {offering.section})
                    </option>
                  ))}
                </select>

                {optionsQuery.isError && (
                  <p className="mt-2 text-sm text-red-600">
                    Unable to load assigned courses.
                  </p>
                )}

                {!optionsQuery.isPending &&
                  !optionsQuery.isError &&
                  courseOfferings.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                      You have no active assigned course offerings.
                    </p>
                  )}
              </div>
            )}

            <div>
              <label
                htmlFor="announcement-title"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Title
              </label>

              <input
                id="announcement-title"
                value={values.title}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                maxLength={100}
                required
                className={fieldClass}
                placeholder="Enter announcement title"
              />
            </div>

            <div>
              <label
                htmlFor="announcement-detail"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Details
              </label>

              <textarea
                id="announcement-detail"
                rows={5}
                value={values.detail}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    detail: event.target.value,
                  }))
                }
                maxLength={5000}
                required
                className={fieldClass}
                placeholder="Write the complete announcement..."
              />

              <p className="mt-1 text-right text-xs text-slate-500">
                {values.detail.length}/5000
              </p>
            </div>

            <div>
              <label
                htmlFor="announcement-expiry"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Expiry date (optional)
              </label>

              <input
                id="announcement-expiry"
                type="datetime-local"
                value={values.expiresAt}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    expiresAt: event.target.value,
                  }))
                }
                className={fieldClass}
              />
            </div>

            {feedback && (
              <p
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
              >
                {feedback.message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                publishMutation.isPending ||
                (role === 'faculty' &&
                  (!values.courseOfferingId ||
                    optionsQuery.isPending ||
                    optionsQuery.isError ||
                    courseOfferings.length === 0))
              }
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishMutation.isPending
                ? 'Publishing...'
                : 'Publish announcement'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Announcement feed
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {announcements.length} available
              {role === 'student' ? ` · ${unreadCount} unread` : ''}
            </p>
          </div>

          <Link
            to="/"
            className="text-sm font-semibold text-blue-700 dark:text-blue-400"
          >
            Back to dashboard
          </Link>
        </div>

        {!announcementsQuery.isPending && !announcementsQuery.isError && (
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Search announcements
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, details, or author"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={fieldClass}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              {role === 'student' ? (
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(event) => setUnreadOnly(event.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  />
                  Show unread only
                </label>
              ) : (
                <span />
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFeedFilters}
                  className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {announcementsQuery.isPending && (
          <p role="status" className="mt-5 text-sm text-slate-500">
            Loading announcements...
          </p>
        )}

        {announcementsQuery.isError && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            Unable to load announcements.
            <button
              type="button"
              onClick={() => announcementsQuery.refetch()}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {feedback?.type === 'error' && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {feedback.message}
          </p>
        )}

        {!announcementsQuery.isPending &&
          !announcementsQuery.isError &&
          announcements.length === 0 && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No announcements are currently available in your permitted view.
            </p>
          )}

        {!announcementsQuery.isPending &&
          !announcementsQuery.isError &&
          announcements.length > 0 &&
          filteredAnnouncements.length === 0 && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No announcements match these filters.
            </p>
          )}

        <div className="mt-5 space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
              role={role}
              onMarkRead={handleMarkRead}
              markingId={markingId}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
