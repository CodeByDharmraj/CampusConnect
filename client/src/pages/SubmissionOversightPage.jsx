
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    ClipboardList,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

function formatDate(value) {
    if (!value) return '—'

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

function getSubmissionStatus(submission) {
    if (submission.status === 'evaluated') return 'Evaluated'
    return 'Awaiting evaluation'
}

function StatusPill({ submission }) {
    const evaluated = submission.status === 'evaluated'

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${evaluated
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
        >
            {getSubmissionStatus(submission)}
        </span>
    )
}

function StatCard({ label, value, icon: Icon, description }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    )
}

export default function SubmissionOversightPage() {
    const { user, accessToken } = useAuth()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const isCoordinator = user?.role === 'coordinator'
    const endpoint = isCoordinator
        ? '/submissions/department'
        : '/submissions/institution'

    const {
        data: submissions = [],
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['submission-oversight', user?.role, accessToken],
        queryFn: async () => {
            const response = await apiClient.get(endpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return response.data?.data?.submissions ?? []
        },
        enabled: Boolean(accessToken && ['coordinator', 'admin'].includes(user?.role)),
    })

    const filteredSubmissions = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()

        return submissions.filter((submission) => {
            const student = submission.studentId
            const assignment = submission.assignmentId
            const offering = assignment?.courseOfferingId
            const course = offering?.courseId

            const searchableText = [
                student?.name,
                student?.email,
                assignment?.title,
                course?.name,
                course?.code,
                offering?.section,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            const matchesSearch =
                !normalizedSearch || searchableText.includes(normalizedSearch)

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'evaluated' &&
                    submission.status === 'evaluated') ||
                (statusFilter === 'pending' &&
                    submission.status !== 'evaluated')

            return matchesSearch && matchesStatus
        })
    }, [submissions, search, statusFilter])

    const evaluatedCount = submissions.filter(
        (submission) => submission.status === 'evaluated',
    ).length

    const pendingCount = submissions.length - evaluatedCount

    if (isLoading) {
        return (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
                Loading submission records...
            </div>
        )
    }

    if (isError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
                <p className="font-medium text-red-700 dark:text-red-300">
                    Unable to load submission records.
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error?.message || 'Please try again.'}
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Submission Oversight
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {isCoordinator
                            ? 'Review submission activity across your department.'
                            : 'Review assignment submission activity across the institution.'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Total submissions"
                    value={submissions.length}
                    icon={ClipboardList}
                    description="Recorded submissions"
                />
                <StatCard
                    label="Evaluated"
                    value={evaluatedCount}
                    icon={Users}
                    description="Reviewed by faculty"
                />
                <StatCard
                    label="Awaiting evaluation"
                    value={pendingCount}
                    icon={ClipboardList}
                    description="Pending faculty review"
                />
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row">
                    <div className="relative flex-1">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search student, assignment, or course..."
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                        <option value="all">All submissions</option>
                        <option value="evaluated">Evaluated</option>
                        <option value="pending">Awaiting evaluation</option>
                    </select>
                </div>

                {filteredSubmissions.length === 0 ? (
                    <div className="p-10 text-center">
                        <ClipboardList
                            size={32}
                            className="mx-auto text-slate-400"
                        />
                        <p className="mt-3 font-medium text-slate-800 dark:text-white">
                            No submissions found
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {submissions.length === 0
                                ? 'Submission records will appear here when students submit assignments.'
                                : 'Try changing your search or status filter.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Student</th>
                                        <th className="px-4 py-3 font-medium">Assignment</th>
                                        <th className="px-4 py-3 font-medium">Course</th>
                                        <th className="px-4 py-3 font-medium">Submitted</th>
                                        <th className="px-4 py-3 font-medium">Grade</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Submission type</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSubmissions.map((submission) => {
                                        const student = submission.studentId
                                        const assignment = submission.assignmentId
                                        const offering = assignment?.courseOfferingId
                                        const course = offering?.courseId

                                        return (
                                            <tr
                                                key={submission._id}
                                                className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                                            >
                                                <td className="px-4 py-4">
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {student?.name || 'Unknown student'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {student?.email || '—'}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {assignment?.title || 'Assignment unavailable'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        Due: {formatDate(assignment?.dueDate)}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {course?.code || '—'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {course?.name || 'Course unavailable'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {offering
                                                            ? `${offering.academicYear || ''} · Semester ${offering.semester || '—'} · Section ${offering.section || '—'}`
                                                            : '—'}
                                                    </p>
                                                </td>

                                                <td className="px-4 py-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                    {formatDate(submission.submittedAt)}
                                                </td>

                                                <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-200">
                                                    {submission.grade == null
                                                        ? 'Not graded'
                                                        : `${submission.grade}/100`}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <StatusPill submission={submission} />
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {submission.isLate ? (
                                                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                Late
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                                On time
                                                            </span>
                                                        )}
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                            v{submission.currentVersion || 1}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                            Showing {filteredSubmissions.length} of {submissions.length} submissions
                        </div>
                    </>
                )}
            </section>

            <p className="text-xs text-slate-500 dark:text-slate-400">
                This page provides read-only oversight. Assignment grading and feedback
                are managed by the assigned faculty member.
            </p>
        </div>
    )
}
