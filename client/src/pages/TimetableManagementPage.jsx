import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authOptions, formatCourse, getErrorMessage, getId } from '../lib/pageHelpers.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MODES = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
]

const emptyForm = {
  courseOfferingId: '',
  facultyId: '',
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '10:00',
  room: '',
  mode: 'offline',
}

function validate(form) {
  const errors = {}

  if (!form.courseOfferingId) errors.courseOfferingId = 'Select a course offering.'
  if (!form.facultyId) errors.facultyId = 'Select a faculty member.'
  if (!form.startTime) errors.startTime = 'Enter a start time.'
  if (!form.endTime) errors.endTime = 'Enter an end time.'
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    errors.endTime = 'End time must be after the start time.'
  }
  if (!form.room.trim() || form.room.trim().length > 100) errors.room = 'Enter a room (up to 100 characters).'

  return errors
}

export default function TimetableManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const options = authOptions(accessToken)

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const offeringsQuery = useQuery({
    queryKey: ['timetable-management', 'offerings', accessToken],
    queryFn: async () => (await apiClient.get('/course-offerings/options', options)).data.offerings,
    enabled: Boolean(accessToken),
  })

  const facultyQuery = useQuery({
    queryKey: ['timetable-management', 'faculty', form.courseOfferingId, accessToken],
    queryFn: async () =>
      (await apiClient.get(`/course-offerings/${encodeURIComponent(form.courseOfferingId)}/faculty`, options)).data.assignments,
    enabled: Boolean(accessToken && form.courseOfferingId),
  })

  const entriesQuery = useQuery({
    queryKey: ['timetable-management', 'entries', accessToken],
    queryFn: async () => (await apiClient.get('/timetable', options)).data.entries,
    enabled: Boolean(accessToken),
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['timetable-management'] })
    await queryClient.invalidateQueries({ queryKey: ['timetable'] })
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? apiClient.patch(`/timetable/${encodeURIComponent(id)}`, payload, options)
        : apiClient.post('/timetable', payload, options),
    onSuccess: async (_data, variables) => {
      setForm(emptyForm)
      setEditingId(null)
      setFeedback({ type: 'success', message: variables.id ? 'Timetable entry updated.' : 'Timetable entry created.' })
      await refresh()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiClient.patch(`/timetable/${encodeURIComponent(id)}/deactivate`, {}, options),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Timetable entry removed.' })
      await refresh()
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const setField = (field) => (event) => {
    const value = event.target.value

    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'courseOfferingId' ? { facultyId: '' } : {}),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    saveMutation.mutate({
      id: editingId,
      payload: {
        courseOfferingId: form.courseOfferingId,
        facultyId: form.facultyId,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim(),
        mode: form.mode,
      },
    })
  }

  function startEditing(entry) {
    setEditingId(entry._id)
    setFeedback(null)
    setForm({
      courseOfferingId: getId(entry.courseOfferingId),
      facultyId: getId(entry.facultyId),
      dayOfWeek: String(entry.dayOfWeek),
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room ?? '',
      mode: entry.mode ?? 'offline',
    })
  }

  const entries = [...(entriesQuery.data ?? [])]
    .filter((entry) => entry.isActive !== false)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || String(a.startTime).localeCompare(String(b.startTime)))

  const facultyOptions = (facultyQuery.data ?? [])
    .filter((assignment) => assignment.isActive)
    .map((assignment) => ({ value: getId(assignment.facultyId), label: assignment.facultyId?.name }))

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Timetable Management</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Schedule weekly classes. Only faculty assigned to an offering can be timetabled for it.
        </p>
      </header>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock size={18} aria-hidden="true" /> {editingId ? 'Edit entry' : 'New entry'}
          </CardTitle>
          <CardDescription>Times use 24-hour format.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Course offering"
                options={(offeringsQuery.data ?? []).map((offering) => ({
                  value: offering._id,
                  label: `${formatCourse(offering.courseId)} · Sem ${offering.semester} · ${offering.section}`,
                }))}
                value={form.courseOfferingId}
                onChange={setField('courseOfferingId')}
                error={errors.courseOfferingId}
                required
              />
              <Select
                label="Faculty"
                options={facultyOptions}
                value={form.facultyId}
                onChange={setField('facultyId')}
                error={errors.facultyId}
                disabled={!form.courseOfferingId}
                hint={form.courseOfferingId && facultyOptions.length === 0 && !facultyQuery.isLoading ? 'No faculty assigned to this offering yet.' : undefined}
                required
              />
              <Select label="Day" options={DAYS.map((label, value) => ({ value: String(value), label }))} value={form.dayOfWeek} onChange={setField('dayOfWeek')} required />
              <Select label="Mode" options={MODES} value={form.mode} onChange={setField('mode')} required />
              <Input label="Start time" type="time" value={form.startTime} onChange={setField('startTime')} error={errors.startTime} required />
              <Input label="End time" type="time" value={form.endTime} onChange={setField('endTime')} error={errors.endTime} required />
              <Input label="Room" value={form.room} onChange={setField('room')} error={errors.room} required />
            </div>
            {feedback ? (
              <p role={feedback.type === 'error' ? 'alert' : 'status'}
                className={feedback.type === 'error' ? 'text-sm text-red-700 dark:text-red-300' : 'text-sm text-green-700 dark:text-green-300'}>
                {feedback.message}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" isLoading={saveMutation.isPending}>{editingId ? 'Save changes' : 'Add entry'}</Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm); setErrors({}) }}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader><CardTitle className="text-base">Scheduled classes</CardTitle></CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <p role="status" className="text-sm text-slate-600">Loading timetable…</p>
          ) : entriesQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(entriesQuery.error)}</p>
          ) : entries.length === 0 ? (
            <EmptyState title="No classes scheduled" description="Add the first timetable entry using the form above." />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {entries.map((entry) => (
                <li key={entry._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCourse(entry.courseOfferingId?.courseId)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {DAYS[entry.dayOfWeek]} {entry.startTime}–{entry.endTime} · {entry.room} · {entry.facultyId?.name ?? 'Faculty unavailable'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="info">{entry.mode}</StatusBadge>
                    <Button size="sm" variant="outline" onClick={() => startEditing(entry)}>Edit</Button>
                    <Button size="sm" variant="danger" isLoading={deactivateMutation.isPending && deactivateMutation.variables === entry._id} onClick={() => deactivateMutation.mutate(entry._id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
