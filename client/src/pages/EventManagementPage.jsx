import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const categories = [
  'Technical', 'Cultural', 'Sports', 'Literary', 'Social',
  'Entrepreneurship', 'Workshop', 'Seminar', 'Other',
]
const statuses = ['draft', 'published', 'cancelled', 'completed']
const statusStyles = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}
const inputClass = 'mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'
const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-200'
const primaryButton = 'inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))
}

function emptyForm() {
  return {
    title: '', description: '', category: 'Technical', clubId: '',
    departmentId: '', startsAt: '', endsAt: '', venue: '', capacity: '',
    registrationOpensAt: '', registrationClosesAt: '',
  }
}

function EventCard({ event, canManage, busy, onEdit, onAction, isStudent, isRegistered, registrationBusy, onRegister, onCancelRegistration }) {
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const isDraft = event.status === 'draft'
  const isPublished = event.status === 'published'
  const canComplete = isPublished && new Date(event.endsAt) <= new Date()
  const now = new Date()
  const registrationOpen = isPublished && new Date(event.startsAt) > now && (!event.registrationOpensAt || new Date(event.registrationOpensAt) <= now) && (!event.registrationClosesAt || new Date(event.registrationClosesAt) > now) && (event.capacity == null || (event.registeredCount || 0) < event.capacity)

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{event.category}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[event.status] || statusStyles.draft}`}>{event.status}</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{event.departmentId?.code || event.departmentId?.name || 'Campus'}</span>
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{event.title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-400">{event.description}</p>
      <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 dark:border-slate-800">
        <div><dt className="text-xs font-medium text-slate-500">Starts</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDate(event.startsAt)}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Ends</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDate(event.endsAt)}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Venue</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{event.venue}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Organised by</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{event.clubId?.name || 'Campus club'}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Registrations</dt><dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{event.registeredCount || 0}{event.capacity != null ? ` / ${event.capacity} seats` : ' registered · Unlimited capacity'}</dd></div>
      </dl>
      {isStudent && isPublished && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="text-sm">
            {isRegistered ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">You are registered for this event.</span> : registrationOpen ? <span className="text-slate-600 dark:text-slate-400">Registration is open.</span> : <span className="text-slate-500 dark:text-slate-400">{event.capacity != null && (event.registeredCount || 0) >= event.capacity ? 'This event is full.' : 'Registration is not currently open.'}</span>}
          </div>
          {isRegistered ? <button type="button" className={secondaryButton} disabled={registrationBusy} onClick={() => onCancelRegistration(event)}>{registrationBusy ? 'Cancelling…' : 'Cancel registration'}</button> : <button type="button" className={primaryButton} disabled={!registrationOpen || registrationBusy} onClick={() => onRegister(event)}>{registrationBusy ? 'Registering…' : 'Register for event'}</button>}
        </div>
      )}
      {event.status === 'cancelled' && event.cancellationReason && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">Cancellation reason: {event.cancellationReason}</p>
      )}
      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {isDraft && <>
            <button type="button" className={secondaryButton} onClick={() => onEdit(event)}>Edit draft</button>
            <button type="button" className={primaryButton} disabled={busy} onClick={() => onAction(event, 'publish')}>Publish</button>
          </>}
          {(isDraft || isPublished) && !showCancel && <button type="button" className={secondaryButton} disabled={busy} onClick={() => setShowCancel(true)}>Cancel event</button>}
          {showCancel && <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); onAction(event, 'cancel', cancelReason); setShowCancel(false) }}>
            <input className={inputClass} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={500} placeholder="Optional cancellation reason" aria-label="Cancellation reason" />
            <button className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy}>Confirm cancellation</button>
            <button type="button" className={secondaryButton} onClick={() => setShowCancel(false)}>Keep event</button>
          </form>}
          {canComplete && <button type="button" className={primaryButton} disabled={busy} onClick={() => onAction(event, 'complete')}>Mark completed</button>}
          {['published', 'completed'].includes(event.status) && new Date(event.startsAt) <= new Date() && <Link to={`/events/${event._id}/attendance`} className={secondaryButton}>Manage attendance</Link>}
        </div>
      )}
    </article>
  )
}

export default function EventManagementPage() {
  const { user, accessToken } = useAuth()
  const role = user?.role
  const canManage = ['admin', 'coordinator'].includes(role)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [upcoming, setUpcoming] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [feedback, setFeedback] = useState(null)
  const isStudent = role === 'student'
  const options = { headers: { Authorization: `Bearer ${accessToken}` } }

  const eventsQuery = useQuery({
    queryKey: ['events', accessToken, search, category, status, upcoming],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (category !== 'all') params.set('category', category)
      if (status !== 'all') params.set('status', status)
      if (upcoming !== 'all') params.set('upcoming', upcoming)
      const response = await apiClient.get(`/events${params.size ? `?${params}` : ''}`, options)
      return response.data.events
    },
    enabled: Boolean(accessToken),
  })

  const myRegistrationsQuery = useQuery({
    queryKey: ['my-event-registrations', accessToken, 'registered'],
    queryFn: async () => {
      const response = await apiClient.get('/events/registrations/me?status=registered', options)
      return response.data.registrations
    },
    enabled: Boolean(accessToken) && isStudent,
  })

  const registrationIds = new Set((myRegistrationsQuery.data || []).map((item) => item.eventId?._id || item.eventId))

  const registrationMutation = useMutation({
    mutationFn: async ({ event, action }) => {
      if (action === 'register') {
        const response = await apiClient.post(`/events/${event._id}/registrations`, {}, options)
        return response.data.registration
      }
      const response = await apiClient.delete(`/events/${event._id}/registrations/me`, options)
      return response.data.registration
    },
    onSuccess: async (_, variables) => {
      setFeedback({ type: 'success', message: variables.action === 'register' ? 'You are registered for this event.' : 'Your event registration was cancelled.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['events'] }),
        queryClient.invalidateQueries({ queryKey: ['my-event-registrations'] }),
      ])
    },
    onError: (error) => setFeedback({ type: 'error', message: error.message || 'Unable to update your event registration.' }),
  })

  const departmentsQuery = useQuery({
    queryKey: ['event-departments', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/departments', options)
      return response.data.departments.filter((department) => department.isActive)
    },
    enabled: Boolean(accessToken) && role === 'admin' && showForm,
  })

  const clubsQuery = useQuery({
    queryKey: ['event-clubs', accessToken, form.departmentId, role],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (role === 'admin' && form.departmentId) params.set('departmentId', form.departmentId)
      const response = await apiClient.get(`/clubs${params.size ? `?${params}` : ''}`, options)
      return response.data.clubs
    },
    enabled: Boolean(accessToken) && showForm && (role !== 'admin' || Boolean(form.departmentId)),
  })

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingEvent) {
        const response = await apiClient.patch(`/events/${editingEvent._id}`, payload, options)
        return response.data.event
      }
      const response = await apiClient.post('/events', payload, options)
      return response.data.event
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: editingEvent ? 'Draft updated successfully.' : 'Event draft created successfully.' })
      setShowForm(false)
      setEditingEvent(null)
      setForm(emptyForm())
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error) => setFeedback({ type: 'error', message: error.message || 'Unable to save the event.' }),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ event, action, reason }) => {
      const body = action === 'cancel' ? { reason: reason || '' } : {}
      const response = await apiClient.patch(`/events/${event._id}/${action}`, body, options)
      return response.data.event
    },
    onSuccess: async (_, variables) => {
      setFeedback({ type: 'success', message: `Event ${variables.action === 'publish' ? 'published' : variables.action === 'cancel' ? 'cancelled' : 'marked completed'}.` })
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error) => setFeedback({ type: 'error', message: error.message || 'Unable to update the event.' }),
  })

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const summary = useMemo(() => ({
    total: events.length,
    published: events.filter((event) => event.status === 'published').length,
    drafts: events.filter((event) => event.status === 'draft').length,
  }), [events])

  function startCreate() {
    setEditingEvent(null)
    setForm(emptyForm())
    setFeedback(null)
    setShowForm(true)
  }

  function startEdit(event) {
    setEditingEvent(event)
    setForm({
      title: event.title || '', description: event.description || '', category: event.category || 'Technical',
      clubId: event.clubId?._id || event.clubId || '', departmentId: event.departmentId?._id || event.departmentId || '',
      startsAt: toLocalInput(event.startsAt), endsAt: toLocalInput(event.endsAt), venue: event.venue || '',
      capacity: event.capacity ?? '', registrationOpensAt: toLocalInput(event.registrationOpensAt),
      registrationClosesAt: toLocalInput(event.registrationClosesAt),
    })
    setFeedback(null)
    setShowForm(true)
  }

  function submitForm(event) {
    event.preventDefault()
    setFeedback(null)
    const payload = {
      title: form.title.trim(), description: form.description.trim(), category: form.category,
      startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
      venue: form.venue.trim(), capacity: form.capacity === '' ? null : Number(form.capacity),
      registrationOpensAt: form.registrationOpensAt ? new Date(form.registrationOpensAt).toISOString() : null,
      registrationClosesAt: form.registrationClosesAt ? new Date(form.registrationClosesAt).toISOString() : null,
    }
    if (!editingEvent) {
      payload.clubId = form.clubId
      if (role === 'admin') payload.departmentId = form.departmentId
    }
    saveMutation.mutate(payload)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value, ...(field === 'departmentId' ? { clubId: '' } : {}) }))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">CampusConnect · Campus life</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Campus Events</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Discover workshops, competitions, cultural programmes, and activities happening across campus.</p>
        </div>
        {canManage && <button type="button" className={primaryButton} onClick={startCreate}>Create event</button>}
      </header>

      {feedback && <div role="status" className={`rounded-xl border p-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'}`}>{feedback.message}</div>}

      {canManage && <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">Events in current view</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">Published</p><p className="mt-1 text-2xl font-bold text-emerald-600">{summary.published}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">Drafts</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.drafts}</p></div>
      </div>}

      {showForm && canManage && <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-7 dark:border-blue-900 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingEvent ? 'Edit event draft' : 'Create an event draft'}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New events remain private until you publish them.</p></div><button type="button" className={secondaryButton} onClick={() => { setShowForm(false); setEditingEvent(null) }}>Close</button></div>
        <form onSubmit={submitForm} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>Event title<input className={inputClass} value={form.title} onChange={(e) => updateField('title', e.target.value)} minLength={5} maxLength={150} required placeholder="e.g. Annual Coding Hackathon" /></label>
          <label className={labelClass}>Category<select className={inputClass} value={form.category} onChange={(e) => updateField('category', e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          {role === 'admin' && !editingEvent && <label className={labelClass}>Department<select className={inputClass} required value={form.departmentId} onChange={(e) => updateField('departmentId', e.target.value)}><option value="">Select department</option>{(departmentsQuery.data || []).map((item) => <option key={item._id} value={item._id}>{item.code ? `${item.code} — ` : ''}{item.name}</option>)}</select></label>}
          <label className={`${labelClass} ${role !== 'admin' ? 'sm:col-span-1' : ''}`}>Organising club<select className={inputClass} required value={form.clubId} onChange={(e) => updateField('clubId', e.target.value)} disabled={Boolean(editingEvent) || clubsQuery.isPending || (role === 'admin' && !form.departmentId)}><option value="">Select active club</option>{(clubsQuery.data || []).map((club) => <option key={club._id} value={club._id}>{club.name} · {club.departmentId?.code || club.departmentId?.name || 'Department'}</option>)}</select></label>
          <label className={labelClass}>Starts at<input className={inputClass} type="datetime-local" value={form.startsAt} onChange={(e) => updateField('startsAt', e.target.value)} required /></label>
          <label className={labelClass}>Ends at<input className={inputClass} type="datetime-local" value={form.endsAt} onChange={(e) => updateField('endsAt', e.target.value)} required min={form.startsAt || undefined} /></label>
          <label className={labelClass}>Venue<input className={inputClass} value={form.venue} onChange={(e) => updateField('venue', e.target.value)} minLength={2} maxLength={200} required placeholder="Auditorium / Lab / Ground" /></label>
          <label className={labelClass}>Capacity <span className="font-normal text-slate-500">(leave empty for unlimited)</span><input className={inputClass} type="number" min="1" max="100000" step="1" value={form.capacity} onChange={(e) => updateField('capacity', e.target.value)} placeholder="Unlimited" /></label>
          <label className={labelClass}>Registration opens<input className={inputClass} type="datetime-local" value={form.registrationOpensAt} onChange={(e) => updateField('registrationOpensAt', e.target.value)} /></label>
          <label className={labelClass}>Registration closes<input className={inputClass} type="datetime-local" value={form.registrationClosesAt} onChange={(e) => updateField('registrationClosesAt', e.target.value)} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<textarea className={inputClass} rows={5} value={form.description} onChange={(e) => updateField('description', e.target.value)} minLength={20} maxLength={10000} required placeholder="Describe the event, who should attend, and what participants can expect." /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button className={primaryButton} disabled={saveMutation.isPending || (role === 'admin' && !editingEvent && !form.departmentId) || !form.clubId}>{saveMutation.isPending ? 'Saving…' : editingEvent ? 'Save draft changes' : 'Create draft'}</button><button type="button" className={secondaryButton} onClick={() => { setShowForm(false); setEditingEvent(null) }}>Discard</button></div>
        </form>
        {clubsQuery.isError && <p className="mt-3 text-sm text-red-600">Unable to load active clubs. Please retry.</p>}
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>Search<input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Event, venue, description…" /></label>
          <label className={labelClass}>Category<select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className={labelClass}>Status<select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All visible statuses</option>{(canManage ? statuses : statuses.filter((item) => item !== 'draft')).map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
          <label className={labelClass}>Schedule<select className={inputClass} value={upcoming} onChange={(e) => setUpcoming(e.target.value)}><option value="all">Any date</option><option value="true">Upcoming</option><option value="false">Past</option></select></label>
        </div>
        {(search || category !== 'all' || status !== 'all' || upcoming !== 'all') && <button type="button" className="mt-3 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400" onClick={() => { setSearch(''); setCategory('all'); setStatus('all'); setUpcoming('all') }}>Clear filters</button>}
      </section>

      {eventsQuery.isPending && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading campus events…</div>}
      {eventsQuery.isError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{eventsQuery.error.message || 'Unable to load events.'}<button type="button" className="ml-2 font-semibold underline" onClick={() => eventsQuery.refetch()}>Retry</button></div>}
      {!eventsQuery.isPending && !eventsQuery.isError && events.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold text-slate-900 dark:text-white">No events found</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try changing your filters, or check again later for new campus activities.</p></div>}
      {!eventsQuery.isPending && !eventsQuery.isError && events.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{events.map((event) => <EventCard key={event._id} event={event} canManage={canManage} busy={actionMutation.isPending} onEdit={startEdit} onAction={(item, action, reason) => actionMutation.mutate({ event: item, action, reason })} isStudent={isStudent} isRegistered={registrationIds.has(event._id)} registrationBusy={registrationMutation.isPending} onRegister={(item) => registrationMutation.mutate({ event: item, action: 'register' })} onCancelRegistration={(item) => registrationMutation.mutate({ event: item, action: 'cancel' })} />)}</div>}
      <p className="text-xs text-slate-500 dark:text-slate-400">Looking for student communities? <Link className="font-semibold text-blue-700 hover:underline dark:text-blue-400" to="/clubs-events">Explore clubs</Link>.</p>
    </div>
  )
}
