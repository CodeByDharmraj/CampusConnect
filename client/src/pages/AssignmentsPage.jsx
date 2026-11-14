import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CalendarClock, ClipboardList } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
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
import {
  authOptions,
  formatCourse,
  formatDateTime,
  formatOfferingTerm,
  getErrorMessage,
} from '../lib/pageHelpers.js'

const ROLE_COPY = {
  student: 'Published assignments for the courses you are enrolled in.',
  faculty: 'Assignments for the course offerings you teach.',
  coordinator: 'Assignments across your department’s active offerings.',
  admin: 'Assignments across all active course offerings.',
}

function getDueState(assignment) {
  if (assignment.status === 'draft') return { label: 'Draft', variant: 'secondary' }
  if (!assignment.dueDate) return { label: 'Open', variant: 'info' }

  return new Date(assignment.dueDate) < new Date()
    ? { label: 'Past due', variant: 'danger' }
    : { label: 'Open', variant: 'success' }
}

export default function AssignmentsPage() {
  const { accessToken, user } = useAuth()

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/assignments', authOptions(accessToken))

      return response.data.assignments
    },
    enabled: Boolean(accessToken),
  })

  const assignments = [...(assignmentsQuery.data ?? [])].sort(
    (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0),
  )

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Assignments
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {ROLE_COPY[user?.role] ?? 'Review assignments and deadlines.'}
        </p>
      </header>

      {assignmentsQuery.isLoading ? (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
          Loading assignments…
        </p>
      ) : assignmentsQuery.isError ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {getErrorMessage(assignmentsQuery.error)}
        </p>
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Assignments will appear here once they are published for your courses."
          icon={<ClipboardList size={28} strokeWidth={1.7} />}
        />
      ) : (
        <ul className="space-y-4">
          {assignments.map((assignment) => {
            const state = getDueState(assignment)
            const offering = assignment.courseOfferingId

            return (
              <li key={assignment._id}>
                <Card padding="lg">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{assignment.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {formatCourse(offering?.courseId)}
                          {offering ? ` · ${formatOfferingTerm(offering)}` : ''}
                        </CardDescription>
                      </div>
                      <StatusBadge variant={state.variant}>{state.label}</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {assignment.description ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {assignment.description}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <CalendarClock size={16} aria-hidden="true" />
                      Due {formatDateTime(assignment.dueDate)}
                    </p>
                    {user?.role === 'student' ? (
                      <Link to="/submissions">
                        <Button size="sm">Open submissions</Button>
                      </Link>
                    ) : null}
                    {user?.role === 'faculty' ? (
                      <Link to="/assignment-management">
                        <Button size="sm" variant="outline">Manage assignments</Button>
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
