import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const buttonClass = 'inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function MyEventRegistrationsPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('registered')
  const [feedback, setFeedback] = useState(null)
  const options = { headers: { Authorization: `Bearer ${accessToken}` } }

  const registrationsQuery = useQuery({
    queryKey: ['my-event-registrations', accessToken, status],
    queryFn: async () => {
      const params = status === 'all' ? '' : `?status=${status}`
      const response = await apiClient.get(`/events/registrations/me${params}`, options)
      return response.data.registrations
    },
    enabled: Boolean(accessToken),
  })

  const cancelMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await apiClient.delete(`/events/${eventId}/registrations/me`, options)
      return response.data.registration
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Your registration has been cancelled.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-event-registrations'] }),
        queryClient.invalidateQueries({ queryKey: ['events'] }),
      ])
    },
    onError: (error) => setFeedback({ type: 'error', message: error.message || 'Unable to cancel registration.' }),
  })

  const registrations = registrationsQuery.data || []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Campus activities</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My event registrations</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Keep track of the events you have joined and manage your registrations.</p>
        </div>
        <Link to="/events" className={buttonClass}>Browse campus events</Link>
      </header>

      {feedback && <div role="status" className={`rounded-xl p-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>{feedback.message}</div>}

      <div className="flex flex-wrap gap-2" aria-label="Filter registrations">
        {[['registered', 'Active registrations'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={status === value ? 'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white' : buttonClass}>{label}</button>
        ))}
      </div>

      {registrationsQuery.isPending && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your registrations…</div>}
      {registrationsQuery.isError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{registrationsQuery.error.message || 'Unable to load registrations.'}<button type="button" className="ml-2 font-semibold underline" onClick={() => registrationsQuery.refetch()}>Retry</button></div>}
      {!registrationsQuery.isPending && !registrationsQuery.isError && registrations.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold text-slate-900 dark:text-white">No registrations here yet</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Browse campus events to discover activities and register for one.</p><Link to="/events" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Explore events</Link></div>}

      {!registrationsQuery.isPending && !registrationsQuery.isError && registrations.length > 0 && <div className="grid gap-4 md:grid-cols-2">
        {registrations.map((registration) => {
          const event = registration.eventId
          if (!event) return null
          const isActive = registration.status === 'registered'
          const eventFinished = new Date(event.endsAt) <= new Date()
          return (
            <article key={registration._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{event.category}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{registration.status}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{event.description}</p>
              <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Starts</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{formatDate(event.startsAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Venue</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{event.venue}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Registered on</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{formatDate(registration.registeredAt)}</dd></div>
                {registration.cancelledAt && <div className="flex justify-between gap-3"><dt className="text-slate-500">Cancelled on</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{formatDate(registration.cancelledAt)}</dd></div>}
              </dl>
              {isActive && <button type="button" className="mt-4 w-full rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" disabled={cancelMutation.isPending || eventFinished} onClick={() => cancelMutation.mutate(event._id)}>{eventFinished ? 'Event completed' : cancelMutation.isPending ? 'Cancelling…' : 'Cancel registration'}</button>}
            </article>
          )
        })}
      </div>}
    </div>
  )
}
