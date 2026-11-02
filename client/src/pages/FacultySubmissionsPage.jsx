
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Download,
    FileText,
    RefreshCw,
    Search,
    Send,
    Users,
} from 'lucide-react'

import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Textarea from '../components/Textarea.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'

function getErrorMessage(error) {
    return error?.message || 'Something went wrong. Please try again.'
}

function formatDate(value) {
    if (!value) return 'Not available'
    return new Date(value).toLocaleString()
}

function getCourseLabel(assignment) {
    const offering = assignment.courseOfferingId
    const course = offering?.courseId

    return [
        course?.code || 'Course',
        course?.name || 'Unknown course',
        offering?.semester ? `Semester ${offering.semester}` : null,
        offering?.section ? `Section ${offering.section}` : null,
        offering?.academicYear || null,
    ]
        .filter(Boolean)
        .join(' · ')
}

function SubmissionRow({
    submission,
    onDownload,
    downloading,
    onEvaluate,
    evaluating,
}) {
    const [grade, setGrade] = useState(
        submission.grade === null || submission.grade === undefined
            ? ''
            : String(submission.grade),
    )
    const [feedback, setFeedback] = useState(submission.feedback || '')
    const [formError, setFormError] = useState('')

    const student = submission.studentId
    const currentVersion = submission.versions?.find(
        (version) => version.version === submission.currentVersion,
    )
    const files = currentVersion?.files?.length
        ? currentVersion.files
        : currentVersion?.file
            ? [currentVersion.file]
            : []

    function handleEvaluate(event) {
        event.preventDefault()
        setFormError('')

        const numericGrade = Number(grade)

        if (grade.trim() === '' || !Number.isFinite(numericGrade)) {
            setFormError('Enter a valid grade.')
            return
        }

        if (numericGrade < 0 || numericGrade > 100) {
            setFormError('Grade must be between 0 and 100.')
            return
        }

        if (feedback.length > 5000) {
            setFormError('Feedback cannot exceed 5,000 characters.')
            return
        }

        onEvaluate({
            submissionId: submission._id,
            grade: numericGrade,
            feedback: feedback.trim(),
        })
    }

    return (
        <Card padding="lg">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                        <FileText size={19} aria-hidden="true" />
                    </span>

                    <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-900 dark:text-white">
                            {student?.name || 'Student'}
                        </h3>

                        <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                            {student?.email || 'Email unavailable'}
                        </p>

                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Submitted: {formatDate(submission.submittedAt)}
                        </p>
                    </div>
                </div>

                <StatusBadge
                    variant={submission.status === 'evaluated' ? 'success' : 'warning'}
                >
                    {submission.status === 'evaluated' ? 'Evaluated' : 'Awaiting review'}
                </StatusBadge>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Version {submission.currentVersion} · {files.length} file(s)
                </p>

                {files.map((file, index) => (
                    <div
                        key={`${file.originalName}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div className="min-w-0">
                            <p className="break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                                {file.originalName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            leftIcon={<Download size={15} />}
                            isLoading={downloading}
                            disabled={downloading}
                            onClick={() => onDownload(submission._id, index)}
                        >
                            Download
                        </Button>
                    </div>
                ))}
            </div>

            <form
                onSubmit={handleEvaluate}
                className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700"
            >
                <div>
                    <label
                        htmlFor={`grade-${submission._id}`}
                        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        Grade (out of 100)
                    </label>

                    <Input
                        id={`grade-${submission._id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={grade}
                        onChange={(event) => setGrade(event.target.value)}
                        placeholder="Enter marks"
                        required
                    />
                </div>

                <div>
                    <label
                        htmlFor={`feedback-${submission._id}`}
                        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        Feedback
                    </label>

                    <Textarea
                        id={`feedback-${submission._id}`}
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        rows={3}
                        maxLength={5000}
                        placeholder="Provide constructive feedback to the student..."
                    />

                    <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                        {feedback.length}/5000
                    </p>
                </div>

                {formError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                        {formError}
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    {submission.status === 'evaluated' ? (
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            Current grade: {submission.grade}/100
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            This evaluation will be visible to the student.
                        </p>
                    )}

                    <Button
                        type="submit"
                        size="sm"
                        isLoading={evaluating}
                        disabled={evaluating}
                        leftIcon={!evaluating && <Send size={14} />}
                    >
                        {submission.status === 'evaluated'
                            ? 'Update evaluation'
                            : 'Save evaluation'}
                    </Button>
                </div>
            </form>
        </Card>
    )
}

export default function FacultySubmissionsPage() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()

    const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [feedback, setFeedback] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)

    const assignmentsQuery = useQuery({
        queryKey: ['faculty-review-assignments', accessToken],
        queryFn: async () => {
            const response = await apiClient.get('/assignments', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return response.data.data.assignments
        },
        enabled: Boolean(accessToken),
    })

    const assignments = useMemo(
        () =>
            (assignmentsQuery.data || []).filter(
                (assignment) => assignment.status === 'published',
            ),
        [assignmentsQuery.data],
    )

    const selectedAssignment =
        assignments.find(
            (assignment) => assignment._id === selectedAssignmentId,
        ) || null

    const submissionsQuery = useQuery({
        queryKey: [
            'faculty-assignment-submissions',
            accessToken,
            selectedAssignmentId,
        ],
        queryFn: async () => {
            const response = await apiClient.get(
                `/submissions/assignment/${selectedAssignmentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            )

            return response.data.data.submissions
        },
        enabled: Boolean(accessToken && selectedAssignmentId),
    })

    const evaluateMutation = useMutation({
        mutationFn: ({ submissionId, grade, feedback: evaluationFeedback }) =>
            apiClient.patch(
                `/submissions/${submissionId}/evaluate`,
                {
                    grade,
                    feedback: evaluationFeedback,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            ),

        onSuccess: async () => {
            setFeedback({
                type: 'success',
                message: 'Submission evaluation saved successfully.',
            })

            await queryClient.invalidateQueries({
                queryKey: [
                    'faculty-assignment-submissions',
                    accessToken,
                    selectedAssignmentId,
                ],
            })
        },

        onError: (error) => {
            setFeedback({
                type: 'error',
                message: getErrorMessage(error),
            })
        },
    })

    async function handleDownload(submissionId, fileIndex = 0) {
        setDownloadingId(submissionId)
        setFeedback(null)

        try {
            const response = await apiClient.get(
                `/submissions/${submissionId}/download-url?fileIndex=${fileIndex}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            )

            const downloadUrl = response.data.data.downloadUrl

            if (!downloadUrl) {
                throw new Error('The server did not return a download URL.')
            }

            window.open(downloadUrl, '_blank', 'noopener,noreferrer')
        } catch (error) {
            setFeedback({
                type: 'error',
                message: getErrorMessage(error),
            })
        } finally {
            setDownloadingId(null)
        }
    }

    const submissions = submissionsQuery.data || []

    const filteredSubmissions = submissions.filter((submission) => {
        const search = searchTerm.trim().toLowerCase()

        if (!search) return true

        const name = submission.studentId?.name?.toLowerCase() || ''
        const email = submission.studentId?.email?.toLowerCase() || ''

        return name.includes(search) || email.includes(search)
    })

    const evaluatedCount = submissions.filter(
        (submission) => submission.status === 'evaluated',
    ).length

    const pendingCount = submissions.length - evaluatedCount

    async function refreshPage() {
        await assignmentsQuery.refetch()

        if (selectedAssignmentId) {
            await submissionsQuery.refetch()
        }
    }

    return (
        <section className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Faculty workspace
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        Submission Review
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Review student work, download submitted files, assign grades and
                        provide feedback.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={refreshPage}
                    disabled={
                        assignmentsQuery.isFetching || submissionsQuery.isFetching
                    }
                    isLoading={
                        assignmentsQuery.isFetching || submissionsQuery.isFetching
                    }
                    leftIcon={<RefreshCw size={16} />}
                >
                    Refresh
                </Button>
            </header>

            {feedback && (
                <div
                    role={feedback.type === 'error' ? 'alert' : 'status'}
                    className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
                            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                >
                    {feedback.message}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <Card padding="lg">
                    <CardDescription>Published assignments</CardDescription>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                        {assignments.length}
                    </p>
                </Card>

                <Card padding="lg">
                    <CardDescription>Submissions received</CardDescription>
                    <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {submissions.length}
                    </p>
                </Card>

                <Card padding="lg">
                    <CardDescription>Awaiting evaluation</CardDescription>
                    <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {pendingCount}
                    </p>
                </Card>
            </div>

            <Card padding="lg">
                <CardHeader>
                    <CardTitle>Select an assignment</CardTitle>
                    <CardDescription>
                        Only published assignments from your assigned courses are shown.
                    </CardDescription>
                </CardHeader>

                <CardContent className="mt-4 space-y-3">
                    {assignmentsQuery.isPending ? (
                        <p className="text-sm text-slate-500">
                            Loading your published assignments...
                        </p>
                    ) : assignmentsQuery.isError ? (
                        <div className="space-y-3">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {getErrorMessage(assignmentsQuery.error)}
                            </p>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => assignmentsQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </div>
                    ) : assignments.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            You don't have any published assignments available for review.
                        </p>
                    ) : (
                        <select
                            value={selectedAssignmentId}
                            onChange={(event) => {
                                setSelectedAssignmentId(event.target.value)
                                setSearchTerm('')
                                setFeedback(null)
                            }}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="">Choose an assignment</option>

                            {assignments.map((assignment) => (
                                <option key={assignment._id} value={assignment._id}>
                                    {assignment.title} — {getCourseLabel(assignment)}
                                </option>
                            ))}
                        </select>
                    )}

                    {selectedAssignment && (
                        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                                {selectedAssignment.title}
                            </p>

                            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                                {getCourseLabel(selectedAssignment)}
                            </p>

                            <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                                Deadline: {formatDate(selectedAssignment.dueDate)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedAssignmentId && (
                <section className="space-y-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Student submissions
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {evaluatedCount} evaluated · {pendingCount} awaiting evaluation
                            </p>
                        </div>

                        <div className="relative w-full sm:max-w-xs">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />

                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search students..."
                                aria-label="Search submissions by student"
                                className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            />
                        </div>
                    </div>

                    {submissionsQuery.isPending ? (
                        <Card padding="lg">
                            <CardContent className="py-6 text-sm text-slate-500">
                                Loading student submissions...
                            </CardContent>
                        </Card>
                    ) : submissionsQuery.isError ? (
                        <Card padding="lg">
                            <CardContent className="space-y-3 py-5">
                                <p className="text-sm text-red-600 dark:text-red-400">
                                    {getErrorMessage(submissionsQuery.error)}
                                </p>

                                <Button
                                    variant="outline"
                                    onClick={() => submissionsQuery.refetch()}
                                >
                                    Try again
                                </Button>
                            </CardContent>
                        </Card>
                    ) : filteredSubmissions.length === 0 ? (
                        <Card padding="lg">
                            <CardContent className="py-10 text-center">
                                <Users
                                    size={30}
                                    className="mx-auto text-slate-400"
                                    aria-hidden="true"
                                />

                                <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                                    {submissions.length === 0
                                        ? 'No submissions received yet'
                                        : 'No matching students'}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {submissions.length === 0
                                        ? 'Student submissions will appear here after they upload their work.'
                                        : 'Try searching with another student name or email.'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {filteredSubmissions.map((submission) => (
                                <SubmissionRow
                                    key={submission._id}
                                    submission={submission}
                                    onDownload={handleDownload}
                                    downloading={downloadingId === submission._id}
                                    onEvaluate={(input) => {
                                        setFeedback(null)
                                        evaluateMutation.mutate(input)
                                    }}
                                    evaluating={
                                        evaluateMutation.isPending &&
                                        evaluateMutation.variables?.submissionId === submission._id
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </section>
    )
}
