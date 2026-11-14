import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'

import EmptyState from '../components/EmptyState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import {
  authOptions,
  formatCourse,
  formatDateTime,
  getErrorMessage,
} from '../lib/pageHelpers.js'

function GradeBadge({ grade }) {
  if (grade === null || grade === undefined) {
    return <StatusBadge variant="secondary">Not graded</StatusBadge>
  }

  const variant = grade >= 75 ? 'success' : grade >= 40 ? 'warning' : 'danger'

  return <StatusBadge variant={variant}>{grade} / 100</StatusBadge>
}

function GradeTable({ rows, showStudent }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            {showStudent ? <th className="px-4 py-3">Student</th> : null}
            <th className="px-4 py-3">Assignment</th>
            <th className="px-4 py-3">Course</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Feedback</th>
            <th className="px-4 py-3">Evaluated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id}>
              {showStudent ? (
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{row.student}</div>
                  <div className="text-xs text-slate-500">{row.studentEmail}</div>
                </td>
              ) : null}
              <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{row.assignment}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.course}</td>
              <td className="px-4 py-3"><GradeBadge grade={row.grade} /></td>
              <td className="max-w-xs px-4 py-3 text-slate-700 dark:text-slate-300">
                {row.feedback || '—'}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                {formatDateTime(row.evaluatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function toRow(submission, assignmentOverride) {
  const assignment = assignmentOverride ?? submission.assignmentId
  const course = assignment?.courseOfferingId?.courseId

  return {
    id: submission._id,
    student: submission.studentId?.name || 'Student',
    studentEmail: submission.studentId?.email || '',
    assignment: assignment?.title || 'Assignment',
    course: formatCourse(course),
    grade: submission.grade ?? null,
    feedback: submission.feedback || '',
    evaluatedAt: submission.evaluatedAt || submission.updatedAt,
    status: submission.status,
  }
}

function useGradeRows(role, accessToken) {
  const options = authOptions(accessToken)

  const listPath =
    role === 'student'
      ? '/submissions/my'
      : role === 'admin'
        ? '/submissions/institution'
        : null

  const listQuery = useQuery({
    queryKey: ['grades', role, accessToken],
    queryFn: async () => (await apiClient.get(listPath, options)).data.submissions,
    enabled: Boolean(accessToken && listPath),
  })

  const assignmentsQuery = useQuery({
    queryKey: ['grades-assignments', accessToken],
    queryFn: async () => (await apiClient.get('/assignments', options)).data.assignments,
    enabled: Boolean(accessToken && role === 'faculty'),
  })

  const facultyQueries = useQueries({
    queries: (assignmentsQuery.data ?? []).map((assignment) => ({
      queryKey: ['grades-faculty', assignment._id, accessToken],
      queryFn: async () => {
        const response = await apiClient.get(
          `/submissions/assignment/${encodeURIComponent(assignment._id)}`,
          options,
        )

        return response.data.submissions.map((submission) => toRow(submission, assignment))
      },
    })),
  })

  return useMemo(() => {
    if (role === 'faculty') {
      return {
        isLoading: assignmentsQuery.isLoading || facultyQueries.some((query) => query.isLoading),
        error: assignmentsQuery.error || facultyQueries.find((query) => query.error)?.error,
        rows: facultyQueries.flatMap((query) => query.data ?? []),
      }
    }

    return {
      isLoading: listQuery.isLoading,
      error: listQuery.error,
      rows: (listQuery.data ?? []).map((submission) => toRow(submission)),
    }
  }, [role, listQuery, assignmentsQuery, facultyQueries])
}

export default function GradesPage() {
  const { accessToken, user } = useAuth()
  const role = user?.role
  const { isLoading, error, rows } = useGradeRows(role, accessToken)

  const evaluated = rows.filter((row) => row.status === 'evaluated')

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Grades &amp; Feedback
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {role === 'student'
            ? 'Marks and feedback for your evaluated submissions.'
            : role === 'faculty'
              ? 'Marks you have awarded for your course assignments.'
              : 'Evaluated submissions across the institution.'}
        </p>
      </header>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap size={18} aria-hidden="true" />
            Evaluated work
          </CardTitle>
          <CardDescription>
            {evaluated.length} evaluated of {rows.length} submitted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-400">Loading grades…</p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(error)}</p>
          ) : evaluated.length === 0 ? (
            <EmptyState
              title="No grades yet"
              description="Grades and feedback appear here once submissions have been evaluated."
            />
          ) : (
            <GradeTable rows={evaluated} showStudent={role !== 'student'} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
