import { useState } from 'react'

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

    const courseName = course.name || course.courseName || 'Course'

    const courseCode = course.code || course.courseCode || ''

    return `${courseName}${courseCode ? ` (${courseCode})` : ''} · Semester ${offering.semester} · Section ${offering.section}`

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

function SessionDetails({ session }) {

    if (!session) {

        return <EmptyState message="Attendance session details are unavailable." />

    }

    const course = session.courseOfferingId?.courseId

    const offering = session.courseOfferingId

    const records = session.records ?? []

    const details = [

        {

            label: 'Course',

            value: course?.name || 'Course unavailable',

        },

        {

            label: 'Course code',

            value: course?.code || 'Not available',

        },

        {

            label: 'Academic year',

            value: offering?.academicYear || 'Not available',

        },

        {

            label: 'Semester',

            value: offering?.semester ?? 'Not available',

        },

        {

            label: 'Section',

            value: offering?.section || 'Not available',

        },

        {

            label: 'Faculty',

            value: session.facultyId?.name || 'Not available',

        },

        {

            label: 'Date',

            value: formatDate(session.sessionDate),

        },

        {

            label: 'Time',

            value: `${session.startTime || '--'} – ${session.endTime || '--'}`,

        },

    ]

    return (

        <div className="space-y-5">

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                {details.map((item) => (

                    <div

                        key={item.label}

                        className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"

                    >

                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">

                            {item.label}

                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">

                            {item.value}

                        </p>

                    </div>

                ))}

            </div>

            <div className="flex flex-wrap items-center gap-3">

                <StatusBadge status={session.status} />

                <span className="text-sm text-slate-500 dark:text-slate-400">

                    {records.length} attendance record

                    {records.length === 1 ? '' : 's'}

                </span>

            </div>

            {session.topic && (

                <div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">

                        Topic

                    </h4>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">

                        {session.topic}

                    </p>

                </div>

            )}

            {session.notes && (

                <div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">

                        Notes

                    </h4>

                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">

                        {session.notes}

                    </p>

                </div>

            )}

            <div>

                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">

                    Attendance records

                </h4>

                {records.length === 0 ? (

                    <EmptyState message="No attendance records are available for this session." />

                ) : (

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">

                        <table className="w-full text-left text-sm">

                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">

                                <tr>

                                    <th className="px-4 py-3">Student</th>

                                    <th className="px-4 py-3">Email</th>

                                    <th className="px-4 py-3">Status</th>

                                    <th className="px-4 py-3">Marked at</th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                                {records.map((record) => (

                                    <tr key={record._id}>

                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">

                                            {record.studentId?.name || 'Student'}

                                        </td>

                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">

                                            {record.studentId?.email || 'Not available'}

                                        </td>

                                        <td className="px-4 py-3">

                                            <StatusBadge status={record.status} />

                                        </td>

                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">

                                            {record.markedAt

                                                ? new Date(record.markedAt).toLocaleString('en-IN')

                                                : 'Not available'}

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>

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

    const [activeSession, setActiveSession] = useState(null)

    const [selectedSessionId, setSelectedSessionId] = useState('')

    const [attendance, setAttendance] = useState({})

    const optionsQuery = useQuery({

        queryKey: ['attendance', 'faculty-options', accessToken],

        queryFn: () =>

            apiClient.get(

                '/attendance/faculty/options',

                authOptions(accessToken),

            ),

        enabled: Boolean(accessToken),

    })

    const sessionsQuery = useQuery({

        queryKey: ['attendance', 'sessions', accessToken],

        queryFn: () =>

            apiClient.get('/attendance/sessions', authOptions(accessToken)),

        enabled: Boolean(accessToken),

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

    const selectedOffering = options.find(

        (item) => String(item._id) === String(selectedOfferingId),

    )

    const rosterQuery = useQuery({

        queryKey: [

            'attendance',

            'faculty-roster',

            activeSession?.courseOfferingId,

            accessToken,

        ],

        queryFn: () =>

            apiClient.get(

                `/attendance/faculty/offerings/${activeSession.courseOfferingId}/roster`,

                authOptions(accessToken),

            ),

        enabled: Boolean(activeSession?.courseOfferingId && accessToken),

    })

    const students = rosterQuery.data?.data?.students ?? []

    const createSessionMutation = useMutation({

        mutationFn: (payload) =>

            apiClient.post(

                '/attendance/faculty/sessions',

                payload,

                authOptions(accessToken),

            ),

        onSuccess: (response) => {

            const created = response.data?.data?.session

            if (created?._id) {

                setActiveSession(created)

                setAttendance({})

            }

            queryClient.invalidateQueries({

                queryKey: ['attendance', 'sessions'],

            })

        },

    })

    const submitAttendanceMutation = useMutation({

        mutationFn: ({ sessionId, payload }) =>

            apiClient.put(

                `/attendance-sessions/${sessionId}/records`,

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

                queryClient.invalidateQueries({

                    queryKey: ['attendance', 'my'],

                }),

            ])

            setActiveSession(null)

            setAttendance({})

            setSelectedOfferingId('')

            setSessionDate('')

            setStartTime('')

            setEndTime('')

            setTopic('')

            setNotes('')

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

    function updateStatus(studentId, status) {
        setAttendance((currentAttendance) => ({
            ...currentAttendance,
            [studentId]: status,
        }))
    }

    function createSession(event) {

        event.preventDefault()

        if (!selectedOfferingId || !sessionDate || !startTime || !endTime) return

        createSessionMutation.mutate({

            courseOfferingId: selectedOfferingId,

            sessionDate: new Date(`${sessionDate}T00:00:00`).toISOString(),

            startTime,

            endTime,

            topic,

            notes,

        })

    }

    function submitBulkAttendance() {

        if (!activeSession?._id || students.length === 0) return

        submitAttendanceMutation.mutate({

            sessionId: activeSession._id,

            payload: {

                attendance: students.map((student) => ({

                    studentId: student._id,

                    status: attendance[student._id] || 'present',

                })),

            },

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

                title="Create attendance session"

                description="Choose an assigned course and create an open session. The enrolled roster is loaded separately before you submit attendance."

            >

                {options.length === 0 ? (

                    <EmptyState message="No active assigned course offerings are available." />

                ) : (

                    <form onSubmit={createSession} className="space-y-5">

                        <div>

                            <label htmlFor="attendance-offering" className="mb-2 block text-sm font-semibold">

                                Course offering

                            </label>

                            <select

                                id="attendance-offering"

                                value={selectedOfferingId}

                                onChange={(event) => setSelectedOfferingId(event.target.value)}

                                required

                                disabled={Boolean(activeSession)}

                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"

                            >

                                <option value="">Select a course offering</option>

                                {options.map((item) => (

                                    <option key={item._id} value={item._id}>

                                        {formatOffering(item)}

                                    </option>

                                ))}

                            </select>

                            {selectedOffering && (

                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">

                                    {selectedOffering.enrolledCount ?? 0} currently enrolled students

                                </p>

                            )}

                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                            <div>

                                <label htmlFor="attendance-date" className="mb-2 block text-sm font-semibold">Class date</label>

                                <input id="attendance-date" type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} required disabled={Boolean(activeSession)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />

                            </div>

                            <div>

                                <label htmlFor="attendance-start" className="mb-2 block text-sm font-semibold">Start time</label>

                                <input id="attendance-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required disabled={Boolean(activeSession)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />

                            </div>

                            <div>

                                <label htmlFor="attendance-end" className="mb-2 block text-sm font-semibold">End time</label>

                                <input id="attendance-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required disabled={Boolean(activeSession)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />

                            </div>

                            <div>

                                <label htmlFor="attendance-topic" className="mb-2 block text-sm font-semibold">Class topic</label>

                                <input id="attendance-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} disabled={Boolean(activeSession)} placeholder="e.g. Database normalization" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />

                            </div>

                        </div>

                        <div>

                            <label htmlFor="attendance-notes" className="mb-2 block text-sm font-semibold">Notes</label>

                            <textarea id="attendance-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} disabled={Boolean(activeSession)} placeholder="Optional class notes" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />

                        </div>

                        {createSessionMutation.isError && (

                            <p role="alert" className="text-sm text-red-600">{createSessionMutation.error.message}</p>

                        )}

                        {!activeSession && (

                            <button type="submit" disabled={createSessionMutation.isPending || !selectedOfferingId} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">

                                {createSessionMutation.isPending ? 'Creating session...' : 'Create session and load roster'}

                            </button>

                        )}

                    </form>

                )}

            </Section>

            {activeSession && (

                <Section

                    title="Mark student attendance"

                    description="Set a status for every enrolled student, then submit the complete roster in one request. Submission finalizes this session."

                >

                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">

                        <div>

                            <p className="font-semibold text-blue-900 dark:text-blue-200">

                                {formatOffering(selectedOffering)}

                            </p>

                            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">

                                {formatDate(activeSession.sessionDate)} · {activeSession.startTime}–{activeSession.endTime}

                            </p>

                        </div>

                        <StatusBadge status="open" />

                    </div>

                    {rosterQuery.isPending ? (

                        <LoadingState />

                    ) : rosterQuery.isError ? (

                        <ErrorState error={rosterQuery.error} retry={() => rosterQuery.refetch()} />

                    ) : students.length === 0 ? (

                        <EmptyState message="No active enrolled students were returned for this course offering." />

                    ) : (

                        <>

                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                                <p className="text-sm font-semibold">{students.length} students</p>

                                <div className="flex flex-wrap gap-2">

                                    {STATUS_OPTIONS.map((status) => (

                                        <button

                                            key={status}

                                            type="button"

                                            onClick={() => setAttendance(Object.fromEntries(students.map((student) => [student._id, status])))}

                                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold capitalize hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"

                                        >

                                            Mark all {status}

                                        </button>

                                    ))}

                                </div>

                            </div>

                            <div className="space-y-2">

                                {students.map((student) => (

                                    <div key={student._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

                                        <div>

                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</p>

                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{student.email}</p>

                                        </div>

                                        <select

                                            aria-label={`Attendance for ${student.name}`}

                                            value={attendance[student._id] || 'present'}

                                            onChange={(event) => updateStatus(student._id, event.target.value)}

                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize sm:w-40 dark:border-slate-700 dark:bg-slate-950"

                                        >

                                            {STATUS_OPTIONS.map((status) => (

                                                <option key={status} value={status}>{status}</option>

                                            ))}

                                        </select>

                                    </div>

                                ))}

                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3">

                                <button

                                    type="button"

                                    onClick={submitBulkAttendance}

                                    disabled={submitAttendanceMutation.isPending || students.length === 0}

                                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"

                                >

                                    {submitAttendanceMutation.isPending ? 'Submitting attendance...' : `Submit attendance (${students.length})`}

                                </button>

                                <button

                                    type="button"

                                    onClick={() => {

                                        setActiveSession(null)

                                        setAttendance({})

                                    }}

                                    disabled={submitAttendanceMutation.isPending}

                                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold dark:border-slate-700"

                                >

                                    Cancel session setup

                                </button>

                            </div>

                            {submitAttendanceMutation.isError && (

                                <p role="alert" className="mt-3 text-sm text-red-600">{submitAttendanceMutation.error.message}</p>

                            )}

                        </>

                    )}

                </Section>

            )}

            <Section

                title="Attendance session history"

                description="Review sessions already recorded for your assigned courses."

            >

                {sessionsQuery.isPending ? (

                    <LoadingState />

                ) : sessionsQuery.isError ? (

                    <ErrorState error={sessionsQuery.error} retry={() => sessionsQuery.refetch()} />

                ) : (sessionsQuery.data?.data?.sessions ?? []).length === 0 ? (

                    <EmptyState message="No attendance sessions are available yet." />

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

                                    <span className="block text-sm font-semibold">{session.courseOfferingId?.courseId?.name || session.courseOfferingId?.courseId?.courseName || 'Course'}</span>

                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">

                                        {formatDate(session.sessionDate)} · {session.startTime} · {session.topic || 'Class session'}

                                    </span>

                                </span>

                                <StatusBadge status={session.status} />

                            </button>

                        ))}

                    </div>

                )}

            </Section>

            {selectedSessionId && (

                <Section title="Attendance session details">

                    {detailQuery.isPending ? (

                        <LoadingState />

                    ) : detailQuery.isError ? (

                        <ErrorState error={detailQuery.error} retry={() => detailQuery.refetch()} />

                    ) : (

                        <SessionDetails session={detailQuery.data?.data?.session} />

                    )}

                </Section>

            )}

            <Section

                title="Correction requests"

                description="Review requests submitted by students in your assigned course offerings."

            >

                {requestsQuery.isPending ? (

                    <LoadingState />

                ) : requestsQuery.isError ? (

                    <ErrorState error={requestsQuery.error} retry={() => requestsQuery.refetch()} />

                ) : (requestsQuery.data?.data?.requests ?? []).length === 0 ? (

                    <EmptyState message="There are no pending correction requests." />

                ) : (

                    <div className="space-y-3">

                        {requestsQuery.data.data.requests.map((request) => (

                            <article key={request._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">

                                <div className="flex flex-wrap items-center justify-between gap-2">

                                    <p className="font-semibold text-slate-900 dark:text-white">{request.studentId?.name || 'Student'}</p>

                                    <StatusBadge status={request.status} />

                                </div>

                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">

                                    Current: {request.currentStatus} · Requested: {request.requestedStatus}

                                </p>

                                <p className="mt-2 text-sm">{request.reason}</p>

                                <div className="mt-4 flex flex-wrap gap-2">

                                    <button type="button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: request._id, decision: 'approved' })} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>

                                    <button type="button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: request._id, decision: 'rejected' })} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">Reject</button>

                                </div>

                            </article>

                        ))}

                    </div>

                )}

                {reviewMutation.isError && <p role="alert" className="mt-3 text-sm text-red-600">{reviewMutation.error.message}</p>}

            </Section>

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

                            const presentCount = group.records.filter((record) => record.status === 'present').length

                            const lateCount = group.records.filter((record) => record.status === 'late').length

                            const absentCount = group.records.filter((record) => record.status === 'absent').length

                            const excusedCount = group.records.filter((record) => record.status === 'excused').length

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

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">

                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Present: {presentCount}</span>

                                        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Late: {lateCount}</span>

                                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Absent: {absentCount}</span>

                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">Excused: {excusedCount}</span>

                                    </div>

                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">

                                        Attendance = (present + late) ÷ (present + late + absent). Excused sessions are excluded.

                                    </p>

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
