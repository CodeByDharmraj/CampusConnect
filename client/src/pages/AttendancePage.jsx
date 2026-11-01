import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    CalendarCheck,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Users,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused']

function authOptions(accessToken) {
    return {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }
}

function formatDate(value) {
    if (!value) return 'Date unavailable'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return 'Invalid date'

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date)
}

function formatOffering(offering) {
    const course = offering?.courseId

    if (!course) return 'Course unavailable'

    return `${course.name} (${course.code}) · Semester ${offering.semester} · Section ${offering.section}`
}

function StatusBadge({ status }) {
    const styles = {
        present:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        absent:
            'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
        late:
            'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        excused:
            'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
        pending:
            'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        approved:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        rejected:
            'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
        finalized:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        open:
            'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    }

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
        >
            {status}
        </span>
    )
}

function LoadingState() {
    return (
        <div role="status" className="space-y-3">
            <span className="sr-only">Loading attendance information...</span>
            <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
    )
}

function ErrorState({ error, retry }) {
    return (
        <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
        >
            <p className="font-semibold text-red-800 dark:text-red-300">
                Could not load attendance information.
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error?.message || 'An unexpected error occurred.'}
            </p>
            <button
                type="button"
                onClick={retry}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
                <RefreshCw size={15} />
                Try again
            </button>
        </div>
    )
}

function EmptyState({ message }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
            <CalendarCheck
                className="mx-auto mb-3 text-slate-400"
                size={28}
                aria-hidden="true"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
    )
}

function SummaryCard({ title, value, description, icon: Icon }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Icon size={21} />
                </span>
            </div>
        </article>
    )
}

function Section({ title, description, children }) {
    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    )
}

function FacultyAttendance({ accessToken }) {
    const queryClient = useQueryClient()

    const [selectedOfferingId, setSelectedOfferingId] = useState('')
    const [sessionDate, setSessionDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [topic, setTopic] = useState('')
    const [notes, setNotes] = useState('')
    const [attendance, setAttendance] = useState({})
    const [selectedSessionId, setSelectedSessionId] = useState('')

    const optionsQuery = useQuery({
        queryKey: ['attendance', 'faculty-options', accessToken],
        queryFn: () =>
            apiClient.get('/attendance/options', authOptions(accessToken)),
        enabled: Boolean(accessToken),
    })

    const sessionsQuery = useQuery({
        queryKey: ['attendance', 'sessions', accessToken],
        queryFn: () =>
            apiClient.get('/attendance/sessions', authOptions(accessToken)),
        enabled: Boolean(accessToken),
    })

    const requestsQuery = useQuery({
        queryKey: ['attendance', 'correction-requests', accessToken],
        queryFn: () =>
            apiClient.get(
                '/attendance/correction-requests',
                authOptions(accessToken),
            ),
        enabled: Boolean(accessToken),
    })

    const options = optionsQuery.data?.data?.options ?? []

    const selectedOption = options.find(
        (item) =>
            String(item.courseOffering._id) === String(selectedOfferingId),
    )

    const students = selectedOption?.students ?? []

    useEffect(() => {
        if (!selectedOption) {
            setAttendance({})
            return
        }

        setAttendance(
            Object.fromEntries(
                selectedOption.students.map((item) => [
                    item.student._id,
                    'present',
                ]),
            ),
        )
    }, [selectedOfferingId, optionsQuery.data])

    const createMutation = useMutation({
        mutationFn: (payload) =>
            apiClient.post(
                '/attendance/sessions',
                payload,
                authOptions(accessToken),
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['attendance', 'sessions'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['attendance', 'overview'],
                }),
            ])

            setSessionDate('')
            setStartTime('')
            setEndTime('')
            setTopic('')
            setNotes('')
            setAttendance({})
            setSelectedOfferingId('')
        },
    })

    const reviewMutation = useMutation({
        mutationFn: ({ id, decision }) =>
            apiClient.patch(
                `/attendance/correction-requests/${id}/review`,
                { decision },
                authOptions(accessToken),
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['attendance', 'correction-requests'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['attendance', 'my'],
                }),
            ])
        },
    })

    const detailQuery = useQuery({
        queryKey: ['attendance', 'session', selectedSessionId, accessToken],
        queryFn: () =>
            apiClient.get(
                `/attendance/sessions/${selectedSessionId}`,
                authOptions(accessToken),
            ),
        enabled: Boolean(selectedSessionId && accessToken),
    })

    function updateStatus(studentId, status) {
        setAttendance((current) => ({
            ...current,
            [studentId]: status,
        }))
    }

    function submitAttendance(event) {
        event.preventDefault()

        if (!selectedOption || !sessionDate || !startTime) return

        createMutation.mutate({
            courseOfferingId: selectedOfferingId,
            sessionDate: new Date(`${sessionDate}T00:00:00`).toISOString(),
            startTime,
            endTime: endTime || undefined,
            topic,
            notes,
            attendance: students.map((item) => ({
                studentId: item.student._id,
                status: attendance[item.student._id],
            })),
        })
    }

    if (optionsQuery.isPending) return <LoadingState />

    if (optionsQuery.isError) {
        return (
            <ErrorState
                error={optionsQuery.error}
                retry={() => optionsQuery.refetch()}
            />
        )
    }

    return (
        <div className="space-y-6">
            <Section
                title="Take attendance"
                description="Choose one of your assigned course offerings and record every actively enrolled student."
            >
                {options.length === 0 ? (
                    <EmptyState message="No active assigned course offerings are available." />
                ) : (
                    <form onSubmit={submitAttendance} className="space-y-5">
                        <div>
                            <label
                                htmlFor="attendance-offering"
                                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                            >
                                Course offering
                            </label>
                            <select
                                id="attendance-offering"
                                value={selectedOfferingId}
                                onChange={(event) =>
                                    setSelectedOfferingId(event.target.value)
                                }
                                required
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="">Select a course offering</option>
                                {options.map((item) => (
                                    <option
                                        key={item.courseOffering._id}
                                        value={item.courseOffering._id}
                                    >
                                        {formatOffering(item.courseOffering)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedOption && (
                            <>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label
                                            htmlFor="attendance-date"
                                            className="mb-2 block text-sm font-semibold"
                                        >
                                            Class date
                                        </label>
                                        <input
                                            id="attendance-date"
                                            type="date"
                                            value={sessionDate}
                                            onChange={(event) => setSessionDate(event.target.value)}
                                            required
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="attendance-start"
                                            className="mb-2 block text-sm font-semibold"
                                        >
                                            Start time
                                        </label>
                                        <input
                                            id="attendance-start"
                                            type="time"
                                            value={startTime}
                                            onChange={(event) => setStartTime(event.target.value)}
                                            required
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="attendance-end"
                                            className="mb-2 block text-sm font-semibold"
                                        >
                                            End time
                                        </label>
                                        <input
                                            id="attendance-end"
                                            type="time"
                                            value={endTime}
                                            onChange={(event) => setEndTime(event.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="attendance-topic"
                                        className="mb-2 block text-sm font-semibold"
                                    >
                                        Class topic
                                    </label>
                                    <input
                                        id="attendance-topic"
                                        value={topic}
                                        onChange={(event) => setTopic(event.target.value)}
                                        maxLength={200}
                                        placeholder="Example: Database normalization"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="attendance-notes"
                                        className="mb-2 block text-sm font-semibold"
                                    >
                                        Notes
                                    </label>
                                    <textarea
                                        id="attendance-notes"
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        maxLength={1000}
                                        rows={2}
                                        placeholder="Optional class notes"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                                    />
                                </div>

                                <div>
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                            Student attendance
                                        </h3>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {students.length} enrolled students
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {students.map((item) => (
                                            <div
                                                key={item.student._id}
                                                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                        {item.student.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {item.student.email}
                                                    </p>
                                                </div>

                                                <select
                                                    aria-label={`Attendance for ${item.student.name}`}
                                                    value={attendance[item.student._id] || 'present'}
                                                    onChange={(event) =>
                                                        updateStatus(item.student._id, event.target.value)
                                                    }
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize sm:w-36 dark:border-slate-700 dark:bg-slate-950"
                                                >
                                                    {STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {createMutation.isError && (
                                    <p role="alert" className="text-sm text-red-600">
                                        {createMutation.error.message}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        createMutation.isPending ||
                                        students.length === 0 ||
                                        Object.keys(attendance).length !== students.length
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    <CheckCircle2 size={17} />
                                    {createMutation.isPending
                                        ? 'Saving attendance...'
                                        : 'Submit attendance'}
                                </button>
                            </>
                        )}
                    </form>
                )}
            </Section>

            <Section
                title="Correction requests"
                description="Review requests submitted by students in your assigned course offerings."
            >
                {requestsQuery.isPending ? (
                    <LoadingState />
                ) : requestsQuery.isError ? (
                    <ErrorState
                        error={requestsQuery.error}
                        retry={() => requestsQuery.refetch()}
                    />
                ) : (requestsQuery.data?.data?.requests ?? []).length === 0 ? (
                    <EmptyState message="There are no pending correction requests." />
                ) : (
                    <div className="space-y-3">
                        {requestsQuery.data.data.requests.map((request) => (
                            <article
                                key={request._id}
                                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {request.studentId?.name || 'Student'}
                                    </p>
                                    <StatusBadge status={request.status} />
                                </div>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    Current: {request.currentStatus} · Requested:{' '}
                                    {request.requestedStatus}
                                </p>
                                <p className="mt-2 text-sm">{request.reason}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={reviewMutation.isPending}
                                        onClick={() =>
                                            reviewMutation.mutate({
                                                id: request._id,
                                                decision: 'approved',
                                            })
                                        }
                                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        disabled={reviewMutation.isPending}
                                        onClick={() =>
                                            reviewMutation.mutate({
                                                id: request._id,
                                                decision: 'rejected',
                                            })
                                        }
                                        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
                {reviewMutation.isError && (
                    <p role="alert" className="mt-3 text-sm text-red-600">
                        {reviewMutation.error.message}
                    </p>
                )}
            </Section>

            <SessionList
                query={sessionsQuery}
                selectedSessionId={selectedSessionId}
                onSelect={setSelectedSessionId}
            />

            {selectedSessionId && (
                <Section title="Selected session details">
                    {detailQuery.isPending ? (
                        <LoadingState />
                    ) : detailQuery.isError ? (
                        <ErrorState
                            error={detailQuery.error}
                            retry={() => detailQuery.refetch()}
                        />
                    ) : (
                        <SessionDetails session={detailQuery.data?.data?.session} />
                    )}
                </Section>
            )}
        </div>
    )
}

function SessionList({ query, selectedSessionId, onSelect }) {
    if (query.isPending) return <Section title="Attendance history"><LoadingState /></Section>

    if (query.isError) {
        return (
            <Section title="Attendance history">
                <ErrorState error={query.error} retry={() => query.refetch()} />
            </Section>
        )
    }

    const sessions = query.data?.data?.sessions ?? []

    return (
        <Section
            title="Attendance history"
            description="Previously recorded class sessions."
        >
            {sessions.length === 0 ? (
                <EmptyState message="No attendance sessions have been recorded." />
            ) : (
                <div className="space-y-2">
                    {sessions.map((session) => (
                        <button
                            key={session._id}
                            type="button"
                            onClick={() => onSelect(session._id)}
                            className={`flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${selectedSessionId === session._id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span>
                                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                                    {session.courseOfferingId?.courseId?.name || 'Course'}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                    {formatDate(session.sessionDate)} · {session.startTime}
                                </span>
                            </span>
                            <StatusBadge status={session.status} />
                        </button>
                    ))}
                </div>
            )}
        </Section>
    )
}

function SessionDetails({ session }) {
    if (!session) return <EmptyState message="Session details are unavailable." />

    return (
        <div className="space-y-4">
            <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                    {session.courseOfferingId?.courseId?.name || 'Course'}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(session.sessionDate)} · {session.startTime}
                    {session.endTime ? `–${session.endTime}` : ''}
                </p>
            </div>

            {session.topic && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Topic: {session.topic}
                </p>
            )}

            <div className="space-y-2">
                {(session.records ?? []).map((record) => (
                    <div
                        key={record._id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                        <span className="text-sm font-medium">
                            {record.studentId?.name || 'Student'}
                        </span>
                        <StatusBadge status={record.status} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function StudentAttendance({ accessToken }) {
    const queryClient = useQueryClient()
    const [selectedRecordId, setSelectedRecordId] = useState('')
    const [requestedStatus, setRequestedStatus] = useState('present')
    const [reason, setReason] = useState('')

    const attendanceQuery = useQuery({
        queryKey: ['attendance', 'my', accessToken],
        queryFn: () =>
            apiClient.get('/attendance/my', authOptions(accessToken)),
        enabled: Boolean(accessToken),
    })

    const requestsQuery = useQuery({
        queryKey: ['attendance', 'correction-requests', accessToken],
        queryFn: () =>
            apiClient.get(
                '/attendance/correction-requests',
                authOptions(accessToken),
            ),
        enabled: Boolean(accessToken),
    })

    const correctionMutation = useMutation({
        mutationFn: ({ id, payload }) =>
            apiClient.post(
                `/attendance/records/${id}/correction-requests`,
                payload,
                authOptions(accessToken),
            ),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['attendance', 'correction-requests'],
            })
            setSelectedRecordId('')
            setReason('')
        },
    })

    if (attendanceQuery.isPending) return <LoadingState />

    if (attendanceQuery.isError) {
        return (
            <ErrorState
                error={attendanceQuery.error}
                retry={() => attendanceQuery.refetch()}
            />
        )
    }

    const records = attendanceQuery.data?.data?.records ?? []

    const grouped = new Map()

    for (const record of records) {
        const offering = record.sessionId?.courseOfferingId
        const key = offering?._id || 'unknown'

        if (!grouped.has(key)) {
            grouped.set(key, {
                offering,
                records: [],
            })
        }

        grouped.get(key).records.push(record)
    }

    return (
        <div className="space-y-6">
            <Section
                title="My attendance"
                description="Your attendance records for enrolled and completed courses."
            >
                {records.length === 0 ? (
                    <EmptyState message="No attendance records are available yet." />
                ) : (
                    <div className="space-y-5">
                        {[...grouped.values()].map((group, index) => {
                            const countable = group.records.filter(
                                (record) => record.status !== 'excused',
                            )
                            const attended = countable.filter((record) =>
                                ['present', 'late'].includes(record.status),
                            ).length
                            const percentage = countable.length
                                ? (attended / countable.length) * 100
                                : 0

                            return (
                                <article
                                    key={group.offering?._id || index}
                                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">
                                                {group.offering?.courseId?.name || 'Course'}
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                {group.offering?.courseId?.code || ''}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                                {percentage.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {attended} of {countable.length} counted sessions
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="h-full rounded-full bg-blue-600"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        {group.records.map((record) => (
                                            <div
                                                key={record._id}
                                                className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/60"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {formatDate(record.sessionId?.sessionDate)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {record.sessionId?.topic || 'Class session'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={record.status} />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedRecordId(record._id)
                                                            setRequestedStatus(record.status === 'present' ? 'absent' : 'present')
                                                        }}
                                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                                                    >
                                                        Request correction
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </Section>

            {selectedRecordId && (
                <Section
                    title="Request an attendance correction"
                    description="Explain why the recorded status should be changed. Your assigned faculty member will review it."
                >
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            correctionMutation.mutate({
                                id: selectedRecordId,
                                payload: { requestedStatus, reason },
                            })
                        }}
                    >
                        <div>
                            <label
                                htmlFor="requested-status"
                                className="mb-2 block text-sm font-semibold"
                            >
                                Requested status
                            </label>
                            <select
                                id="requested-status"
                                value={requestedStatus}
                                onChange={(event) => setRequestedStatus(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                            >
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="correction-reason"
                                className="mb-2 block text-sm font-semibold"
                            >
                                Reason
                            </label>
                            <textarea
                                id="correction-reason"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                minLength={10}
                                maxLength={1000}
                                rows={4}
                                required
                                placeholder="Explain why this attendance record needs correction."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                            />
                        </div>

                        {correctionMutation.isError && (
                            <p role="alert" className="text-sm text-red-600">
                                {correctionMutation.error.message}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={
                                    correctionMutation.isPending ||
                                    reason.trim().length < 10
                                }
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                Submit request
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedRecordId('')}
                                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </Section>
            )}

            <Section
                title="My correction requests"
                description="Check the decisions on your submitted requests."
            >
                {requestsQuery.isPending ? (
                    <LoadingState />
                ) : requestsQuery.isError ? (
                    <ErrorState
                        error={requestsQuery.error}
                        retry={() => requestsQuery.refetch()}
                    />
                ) : (requestsQuery.data?.data?.requests ?? []).length === 0 ? (
                    <EmptyState message="You haven't submitted any correction requests." />
                ) : (
                    <div className="space-y-3">
                        {requestsQuery.data.data.requests.map((request) => (
                            <article
                                key={request._id}
                                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold">
                                        {request.currentStatus} → {request.requestedStatus}
                                    </p>
                                    <StatusBadge status={request.status} />
                                </div>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    {request.reason}
                                </p>
                                {request.reviewRemarks && (
                                    <p className="mt-2 text-sm">
                                        Faculty remarks: {request.reviewRemarks}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    )
}

function ReadOnlyAttendance({ accessToken, role }) {
    const overviewQuery = useQuery({
        queryKey: ['attendance', 'overview', accessToken],
        queryFn: () =>
            apiClient.get('/attendance/overview', authOptions(accessToken)),
        enabled: Boolean(accessToken),
    })

    const sessionsQuery = useQuery({
        queryKey: ['attendance', 'sessions', accessToken],
        queryFn: () =>
            apiClient.get('/attendance/sessions', authOptions(accessToken)),
        enabled: Boolean(accessToken),
    })

    const [selectedSessionId, setSelectedSessionId] = useState('')

    const detailQuery = useQuery({
        queryKey: ['attendance', 'session', selectedSessionId, accessToken],
        queryFn: () =>
            apiClient.get(
                `/attendance/sessions/${selectedSessionId}`,
                authOptions(accessToken),
            ),
        enabled: Boolean(selectedSessionId && accessToken),
    })

    if (overviewQuery.isPending) return <LoadingState />

    if (overviewQuery.isError) {
        return (
            <ErrorState
                error={overviewQuery.error}
                retry={() => overviewQuery.refetch()}
            />
        )
    }

    const overview = overviewQuery.data?.data?.overview

    return (
        <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Attendance sessions"
                    value={overview?.totalSessions ?? 0}
                    description="Recorded class sessions"
                    icon={CalendarCheck}
                />
                <SummaryCard
                    title="Total records"
                    value={overview?.totalRecords ?? 0}
                    description="Student attendance entries"
                    icon={Users}
                />
                <SummaryCard
                    title="Present"
                    value={overview?.totals?.present ?? 0}
                    description="Marked present"
                    icon={CheckCircle2}
                />
                <SummaryCard
                    title="Attendance rate"
                    value={`${overview?.attendancePercentage ?? 0}%`}
                    description="Present and late, excluding excused"
                    icon={Clock3}
                />
            </section>

            <Section
                title={role === 'admin' ? 'Institution attendance' : 'Department attendance'}
                description="This view is read-only. Attendance changes must be handled by assigned faculty through the correction workflow."
            >
                {sessionsQuery.isPending ? (
                    <LoadingState />
                ) : sessionsQuery.isError ? (
                    <ErrorState
                        error={sessionsQuery.error}
                        retry={() => sessionsQuery.refetch()}
                    />
                ) : (sessionsQuery.data?.data?.sessions ?? []).length === 0 ? (
                    <EmptyState message="No attendance sessions are available in this permitted view." />
                ) : (
                    <div className="space-y-2">
                        {sessionsQuery.data.data.sessions.map((session) => (
                            <button
                                key={session._id}
                                type="button"
                                onClick={() => setSelectedSessionId(session._id)}
                                className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:hover:bg-slate-800"
                            >
                                <span>
                                    <span className="block text-sm font-semibold">
                                        {session.courseOfferingId?.courseId?.name || 'Course'}
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                        {formatDate(session.sessionDate)} · {session.startTime}
                                        {' · '}
                                        {session.facultyId?.name || 'Faculty unavailable'}
                                    </span>
                                </span>
                                <StatusBadge status={session.status} />
                            </button>
                        ))}
                    </div>
                )}
            </Section>

            {selectedSessionId && (
                <Section title="Attendance record details">
                    {detailQuery.isPending ? (
                        <LoadingState />
                    ) : detailQuery.isError ? (
                        <ErrorState
                            error={detailQuery.error}
                            retry={() => detailQuery.refetch()}
                        />
                    ) : (
                        <SessionDetails session={detailQuery.data?.data?.session} />
                    )}
                </Section>
            )}
        </div>
    )
}

export default function AttendancePage() {
    const { user, accessToken, isLoading } = useAuth()
    const role = user?.role

    if (isLoading) {
        return <div className="text-sm text-slate-500">Loading your account...</div>
    }

    if (!accessToken) {
        return (
            <EmptyState message="Your authenticated session is unavailable. Please sign in again." />
        )
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <header className="rounded-2xl border border-blue-200 bg-linear-to-br from-white to-blue-50 p-6 dark:border-blue-950 dark:from-slate-900 dark:to-blue-950/40 sm:p-8">
                <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <CalendarCheck size={24} />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Academic management
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                            Attendance Management
                        </h1>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Record, review, and monitor attendance through role-based academic
                    workflows. Every record is retrieved from the CampusConnect API.
                </p>
                <span className="mt-4 inline-flex rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-blue-800 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300">
                    {role}
                </span>
            </header>

            {role === 'faculty' && <FacultyAttendance accessToken={accessToken} />}
            {role === 'student' && <StudentAttendance accessToken={accessToken} />}
            {['admin', 'coordinator'].includes(role) && (
                <ReadOnlyAttendance accessToken={accessToken} role={role} />
            )}
        </div>
    )
}
