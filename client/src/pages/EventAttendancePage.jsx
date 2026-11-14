import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const inputClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
const primaryButton = 'inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function EventAttendancePage() {
  const { eventId } = useParams()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [statuses, setStatuses] = useState({})
  const [feedback, setFeedback] = useState(null)
  const options = { headers: { Authorization: `Bearer ${accessToken}` } }

  const participantsQuery = useQuery({
    queryKey: ['event-participants', accessToken, eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}/participants`, options)
      return response.data
    },
    enabled: Boolean(accessToken && eventId),
  })

  const participants = useMemo(
    () => participantsQuery.data?.participants ?? [],
    [participantsQuery.data?.participants],
  )
  const event = participantsQuery.data?.event
  const summary = participantsQuery.data?.summary

  const initialStatuses = useMemo(() => {
    const values = {}
    for (const participant of participants) {
      values[participant.student.id || participant.student._id] = participant.attendanceStatus === 'unmarked' ? '' : participant.attendanceStatus
    }
    return values
  }, [participants])

  const currentStatuses = Object.keys(statuses).length ? statuses : initialStatuses
  const markedCount = participants.filter((item) => currentStatuses[item.student.id || item.student._id]).length

  const attendanceMutation = useMutation({
    mutationFn: async () => {
      const records = participants
        .map((item) => {
          const studentId = item.student.id || item.student._id
          return { studentId, status: currentStatuses[studentId] }
        })
        .filter((item) => item.status === 'present' || item.status === 'absent')
      const response = await apiClient.put(`/events/${eventId}/attendance`, { records }, options)
      return response.data
    },
    onSuccess: async (data) => {
      setFeedback({ type: 'success', message: `Attendance saved for ${data.updatedCount} participant(s).` })
      setStatuses({})
      await queryClient.invalidateQueries({ queryKey: ['event-participants', accessToken, eventId] })
    },
    onError: (error) => setFeedback({ type: 'error', message: error.message || 'Unable to save event attendance.' }),
  })

  function updateStatus(studentId, status) {
    setStatuses((previous) => ({ ...initialStatuses, ...previous, [studentId]: status }))
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">CampusConnect · Event operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Event Attendance</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review registered participants and record who attended.</p>
        </div>
        <Link to="/events" className={secondaryButton}>Back to events</Link>
      </header>

      {participantsQuery.isPending && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading registered participants…</div>}
      {participantsQuery.isError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{participantsQuery.error.message || 'Unable to load event participants.'}<button type="button" className="ml-2 font-semibold underline" onClick={() => participantsQuery.refetch()}>Retry</button></div>}

      {event && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{event.category}</span><h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{event.title}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{event.clubId?.name || 'Campus club'} · {event.departmentId?.code || event.departmentId?.name || 'Campus'}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">{event.status}</span>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Schedule:</span> <strong className="text-slate-800 dark:text-slate-200">{formatDate(event.startsAt)} – {formatDate(event.endsAt)}</strong></p><p><span className="text-slate-500">Venue:</span> <strong className="text-slate-800 dark:text-slate-200">{event.venue}</strong></p></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          {[['Registered', summary.registered], ['Present', summary.present], ['Absent', summary.absent], ['Unmarked', summary.unmarked]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>)}
        </section>

        {feedback && <div role="status" className={`rounded-xl border p-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'}`}>{feedback.message}</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800"><div><h2 className="font-bold text-slate-900 dark:text-white">Registered participants</h2><p className="mt-1 text-xs text-slate-500">Only active event registrations can receive an attendance record.</p></div><button type="button" className={primaryButton} disabled={attendanceMutation.isPending || markedCount === 0} onClick={() => attendanceMutation.mutate()}>{attendanceMutation.isPending ? 'Saving…' : `Save attendance (${markedCount})`}</button></div>
          {participants.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No active registrations are available for this event.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {participants.map((participant, index) => {
              const studentId = participant.student.id || participant.student._id
              const value = currentStatuses[studentId] || ''
              return <div key={studentId} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_180px] sm:items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{participant.student.name}</p><p className="truncate text-xs text-slate-500">{participant.student.email}</p><p className="mt-1 text-xs text-slate-400">Registered {formatDate(participant.registeredAt)}{participant.markedAt ? ` · Marked ${formatDate(participant.markedAt)}` : ''}</p></div>
                <label className="text-xs font-semibold text-slate-500">Attendance status<select className={`${inputClass} mt-1.5 w-full`} value={value} onChange={(e) => updateStatus(studentId, e.target.value)}><option value="">Not marked</option><option value="present">Present</option><option value="absent">Absent</option></select></label>
              </div>
            })}
          </div>}
          {participants.length > 0 && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800"><button type="button" className={secondaryButton} onClick={() => setStatuses(initialStatuses)}>Reset changes</button><button type="button" className={primaryButton} disabled={attendanceMutation.isPending || markedCount === 0} onClick={() => attendanceMutation.mutate()}>{attendanceMutation.isPending ? 'Saving…' : 'Save attendance'}</button></div>}
        </section>
      </>}
    </div>
  )
}
