
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    RefreshCw,
    Upload,
} from 'lucide-react'

import Button from '../components/Button.jsx'
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

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ACCEPTED_FILE_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
])

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.pptx,.xlsx,.zip'

function getErrorMessage(error) {
    return error?.message || 'Something went wrong. Please try again.'
}

function formatDate(value) {
    if (!value) return 'No deadline specified'

    return new Date(value).toLocaleString()
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size'

    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getAssignmentId(submission) {
    const assignment = submission.assignmentId

    return typeof assignment === 'string' ? assignment : assignment?._id
}

function getSubmissionForAssignment(submissions, assignmentId) {
    return submissions.find(
        (submission) => getAssignmentId(submission) === assignmentId,
    )
}

function isDeadlinePassed(dueDate) {
    return !dueDate || new Date(dueDate).getTime() <= Date.now()
}

function validateSelectedFile(file) {
    if (!file) {
        throw new Error('Choose a file before submitting.')
    }

    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
        throw new Error('File size must be between 1 byte and 10 MB.')
    }

    const extension = file.name.split('.').pop()?.toLowerCase()

    const extensionToMime = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        zip: 'application/zip',
    }

    const expectedType = extensionToMime[extension]

    if (!expectedType || !ACCEPTED_FILE_TYPES.has(expectedType)) {
        throw new Error('Choose a PDF, DOCX, PPTX, XLSX or ZIP file.')
    }

    // Some browsers provide an empty MIME type. Use the known extension
    // mapping rather than rejecting an otherwise supported file.
    if (file.type && file.type !== expectedType) {
        throw new Error('The selected file extension and file type do not match.')
    }

    return expectedType
}

function AssignmentCard({
    assignment,
    submission,
    onSubmit,
    isSubmitting,
    onDownload,
    downloading,
}) {
    const fileInputRef = useRef(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [fileError, setFileError] = useState('')

    const assignmentId = assignment._id
    const deadlinePassed = isDeadlinePassed(assignment.dueDate)
    const hasSubmission = Boolean(submission)

    function handleFileChange(event) {
        const file = event.target.files?.[0] || null

        setSelectedFile(file)
        setFileError('')

        if (file) {
            try {
                validateSelectedFile(file)
            } catch (error) {
                setFileError(error.message)
                setSelectedFile(null)
                event.target.value = ''
            }
        }
    }

    function handleSubmit() {
        if (!selectedFile) {
            setFileError('Choose a file before submitting.')
            return
        }

        onSubmit({
            assignmentId,
            file: selectedFile,
            onSuccess: () => {
                setSelectedFile(null)
                setFileError('')

                if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                }
            },
        })
    }

    return (
        <Card padding="lg">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                            <FileText size={20} aria-hidden="true" />
                        </span>

                        <div>
                            <CardTitle className="text-base">
                                {assignment.title}
                            </CardTitle>

                            <CardDescription className="mt-1">
                                {assignment.courseOfferingId?.courseId?.code || 'Course'}
                                {' · '}
                                {assignment.courseOfferingId?.courseId?.name || 'Unknown course'}
                            </CardDescription>
                        </div>
                    </div>

                    <StatusBadge
                        variant={hasSubmission ? 'success' : 'warning'}
                    >
                        {submission?.status === 'evaluated'
                            ? 'Evaluated'
                            : hasSubmission
                                ? 'Submitted'
                                : deadlinePassed
                                    ? 'Deadline passed'
                                    : 'Not submitted'}
                    </StatusBadge>
                </div>
            </CardHeader>

            <CardContent className="mt-3 space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {assignment.description}
                </p>

                {assignment.instructions && (
                    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Instructions
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {assignment.instructions}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <CalendarClock size={16} aria-hidden="true" />
                    <span>Deadline: {formatDate(assignment.dueDate)}</span>
                </div>

                {submission && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Your latest submission
                            </p>

                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Version {submission.currentVersion}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <FileText size={16} className="text-slate-400" />
                            <span className="break-all text-slate-700 dark:text-slate-300">
                                {submission.versions?.find(
                                    (version) => version.version === submission.currentVersion,
                                )?.file?.originalName || 'Submitted file'}
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Submitted: {formatDate(submission.submittedAt)}
                        </p>

                        {submission.status === 'evaluated' && (
                            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                    Grade: {submission.grade ?? 'Not available'}
                                    {submission.grade !== null ? ' / 100' : ''}
                                </p>

                                {submission.feedback && (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900 dark:text-emerald-200">
                                        {submission.feedback}
                                    </p>
                                )}
                            </div>
                        )}

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            leftIcon={<Download size={15} />}
                            isLoading={downloading}
                            disabled={downloading}
                            onClick={() => onDownload(submission._id)}
                        >
                            Download submitted file
                        </Button>
                    </div>
                )}

                {deadlinePassed ? (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <AlertCircle size={17} className="mt-0.5 shrink-0" />
                        <p>
                            The submission deadline has passed. New submissions and
                            resubmissions are disabled.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div>
                            <label
                                htmlFor={`submission-file-${assignmentId}`}
                                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                {hasSubmission ? 'Choose a new version' : 'Choose your file'}
                            </label>

                            <input
                                ref={fileInputRef}
                                id={`submission-file-${assignmentId}`}
                                type="file"
                                accept={ACCEPTED_EXTENSIONS}
                                onChange={handleFileChange}
                                disabled={isSubmitting}
                                className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:file:bg-slate-800 dark:file:text-slate-200"
                            />

                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                PDF, DOCX, PPTX, XLSX or ZIP. Maximum file size: 10 MB.
                            </p>
                        </div>

                        {selectedFile && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Selected: {selectedFile.name} (
                                {formatFileSize(selectedFile.size)})
                            </p>
                        )}

                        {fileError && (
                            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                                {fileError}
                            </p>
                        )}

                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedFile || isSubmitting}
                            isLoading={isSubmitting}
                            leftIcon={!isSubmitting && <Upload size={16} />}
                        >
                            {hasSubmission ? 'Submit new version' : 'Submit assignment'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function StudentSubmissionsPage() {
    const { accessToken } = useAuth()
    const queryClient = useQueryClient()
    const [feedback, setFeedback] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)

    const assignmentsQuery = useQuery({
        queryKey: ['assignments', accessToken],
        queryFn: async () => {
            const response = await apiClient.get('/assignments', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return response.data.assignments
        },
        enabled: Boolean(accessToken),
    })

    const submissionsQuery = useQuery({
        queryKey: ['my-submissions', accessToken],
        queryFn: async () => {
            const response = await apiClient.get('/submissions/my', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            return response.data.data.submissions
        },
        enabled: Boolean(accessToken),
    })

    const submissionByAssignment = useMemo(() => {
        const map = new Map()

        for (const submission of submissionsQuery.data || []) {
            map.set(getAssignmentId(submission), submission)
        }

        return map
    }, [submissionsQuery.data])

    const submitMutation = useMutation({
        mutationFn: async ({ assignmentId, file }) => {
            const contentType = validateSelectedFile(file)

            // 1. Ask Express for a short-lived, student-specific R2 upload URL.
            const uploadResponse = await apiClient.post(
                '/submissions/upload-url',
                {
                    assignmentId,
                    fileName: file.name,
                    contentType,
                    fileSize: file.size,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            )

            const {
                uploadUrl,
                uploadHeaders,
                objectKey,
            } = uploadResponse.data.data

            if (!uploadUrl || !objectKey || !uploadHeaders) {
                throw new Error('The server returned an incomplete upload response.')
            }

            // 2. Upload the file directly to private Cloudflare R2.
            const uploadResult = await fetch(uploadUrl, {
                method: 'PUT',
                headers: uploadHeaders,
                body: file,
            })

            if (!uploadResult.ok) {
                throw new Error(
                    `File upload failed with status ${uploadResult.status}.`,
                )
            }

            // 3. Ask Express to verify the uploaded object and save the submission.
            const completionResponse = await apiClient.post(
                '/submissions/complete',
                {
                    assignmentId,
                    objectKey,
                    fileName: file.name,
                    contentType,
                    fileSize: file.size,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            )

            return completionResponse.data.data.submission
        },

        onSuccess: async () => {
            setFeedback({
                type: 'success',
                message: 'Your assignment was submitted successfully.',
            })

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['my-submissions'],
                }),
                queryClient.invalidateQueries({
                    queryKey: ['assignments'],
                }),
            ])
        },

        onError: (error) => {
            setFeedback({
                type: 'error',
                message: getErrorMessage(error),
            })
        },
    })

    async function handleDownload(submissionId) {
        setDownloadingId(submissionId)
        setFeedback(null)

        try {
            const response = await apiClient.get(
                `/submissions/${submissionId}/download-url`,
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

    const assignments = assignmentsQuery.data || []
    const submissions = submissionsQuery.data || []
    const isLoading = assignmentsQuery.isPending || submissionsQuery.isPending
    const hasError = assignmentsQuery.isError || submissionsQuery.isError

    const submittedCount = submissions.length
    const evaluatedCount = submissions.filter(
        (submission) => submission.status === 'evaluated',
    ).length

    const refresh = async () => {
        await Promise.all([
            assignmentsQuery.refetch(),
            submissionsQuery.refetch(),
        ])
    }

    return (
        <section className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Student workspace
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        My Submissions
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        View published assignments, upload your work and track faculty
                        evaluations.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={refresh}
                    disabled={assignmentsQuery.isFetching || submissionsQuery.isFetching}
                    isLoading={assignmentsQuery.isFetching || submissionsQuery.isFetching}
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
                    <CardDescription>Submitted assignments</CardDescription>
                    <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {submittedCount}
                    </p>
                </Card>

                <Card padding="lg">
                    <CardDescription>Evaluated submissions</CardDescription>
                    <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {evaluatedCount}
                    </p>
                </Card>
            </div>

            {isLoading ? (
                <Card padding="lg">
                    <CardContent className="flex items-center gap-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                        <Clock3 size={18} className="animate-pulse" />
                        Loading assignments and submission history...
                    </CardContent>
                </Card>
            ) : hasError ? (
                <Card padding="lg">
                    <CardContent className="space-y-3 py-5">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle size={19} />
                            <p className="font-medium">Unable to load your submissions.</p>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {getErrorMessage(
                                assignmentsQuery.error || submissionsQuery.error,
                            )}
                        </p>

                        <Button variant="outline" onClick={refresh}>
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : assignments.length === 0 ? (
                <Card padding="lg">
                    <CardContent className="py-10 text-center">
                        <FileText
                            size={32}
                            className="mx-auto text-slate-400"
                            aria-hidden="true"
                        />

                        <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">
                            No published assignments
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Published assignments for your enrolled courses will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Available assignments
                        </h2>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Submit your work before the deadline. You can upload a new version
                            while submissions remain open.
                        </p>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                        {assignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment._id}
                                assignment={assignment}
                                submission={submissionByAssignment.get(assignment._id)}
                                onSubmit={({ assignmentId, file, onSuccess }) => {
                                    setFeedback(null)

                                    submitMutation.mutate(
                                        { assignmentId, file },
                                        { onSuccess },
                                    )
                                }}
                                isSubmitting={
                                    submitMutation.isPending &&
                                    submitMutation.variables?.assignmentId === assignment._id
                                }
                                onDownload={handleDownload}
                                downloading={downloadingId !== null}
                            />
                        ))}
                    </div>
                </section>
            )}
        </section>
    )
}
