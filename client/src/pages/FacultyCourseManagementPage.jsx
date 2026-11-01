import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Users, RefreshCw } from 'lucide-react'

import { apiClient } from '../lib/apiClient.js'
import { useAuth } from '../context/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/Card.jsx'
import Select from '../components/Select.jsx'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatOffering(offering) {
  const course = offering.courseId

  return `${course.code} — ${course.name} | Semester ${offering.semester} | Section ${offering.section} | ${offering.academicYear}`
}

export default function FacultyCourseManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [feedback, setFeedback] = useState(null)

  const optionsQuery = useQuery({
    queryKey: ['faculty-course-options', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/course-offerings/options', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data
    },
    enabled: Boolean(accessToken),
  })
    
  const assignmentsQuery = useQuery({
    queryKey: ['faculty-assignments', selectedOfferingId, accessToken],
    queryFn: async () => {
      const response = await apiClient.get(
        `/course-offerings/${selectedOfferingId}/faculty`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      return response.data.assignments
    },
    enabled: Boolean(selectedOfferingId && accessToken),
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(
        `/course-offerings/${selectedOfferingId}/faculty`,
        {
          facultyId: selectedFacultyId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
    },
    onSuccess: async () => {
      setSelectedFacultyId('')
      setFeedback({
        type: 'success',
        message: 'Faculty member assigned successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['faculty-assignments', selectedOfferingId],
      })
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (facultyId) => {
      return apiClient.delete(
        `/course-offerings/${selectedOfferingId}/faculty/${facultyId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
    },
    onSuccess: async () => {
      setFeedback({
        type: 'success',
        message: 'Faculty assignment deactivated. Its history is preserved.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['faculty-assignments', selectedOfferingId],
      })
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const offerings = optionsQuery.data?.offerings ?? []
  const faculty = optionsQuery.data?.faculty ?? []
  const assignments = assignmentsQuery.data ?? []

  const selectedOffering = offerings.find(
    (offering) => offering._id === selectedOfferingId,
  )

  const activeAssignments = assignments.filter(
    (assignment) => assignment.isActive,
  )

  const offeringOptions = offerings.map((offering) => ({
    value: offering._id,
    label: formatOffering(offering),
  }))

  const facultyOptions = faculty.map((member) => ({
    value: member._id,
    label: `${member.name} — ${member.email}`,
  }))

  function handleAssign(event) {
    event.preventDefault()
    setFeedback(null)

    if (!selectedOfferingId || !selectedFacultyId) {
      setFeedback({
        type: 'error',
        message: 'Select both a course offering and a faculty member.',
      })
      return
    }

    assignMutation.mutate()
  }

  function handleDeactivate(facultyId, facultyName) {
    const confirmed = window.confirm(
      `Deactivate ${facultyName}'s assignment? The assignment history will be preserved.`,
    )

    if (!confirmed) return

    setFeedback(null)
    deactivateMutation.mutate(facultyId)
  }

  if (optionsQuery.isPending) {
    return (
      <Card padding="lg">
        <CardContent>Loading faculty assignment options...</CardContent>
      </Card>
    )
  }

  if (optionsQuery.isError) {
    return (
      <EmptyState
        title="Couldn't load assignment options"
        description={getErrorMessage(optionsQuery.error)}
        icon={<Users size={28} />}
        action={<Button onClick={() => optionsQuery.refetch()}>Retry</Button>}
      />
    )
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Academic administration
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Faculty-Course Management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Assign faculty members to active course offerings and manage
            teaching assignments.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => optionsQuery.refetch()}
          disabled={optionsQuery.isFetching}
          isLoading={optionsQuery.isFetching}
          leftIcon={!optionsQuery.isFetching && <RefreshCw size={16} />}
        >
          Refresh
        </Button>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="lg">
          <CardDescription>Active course offerings</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {offerings.length}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Active faculty accounts</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {faculty.length}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Active assignments</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {selectedOfferingId ? activeAssignments.length : '—'}
          </p>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Assign faculty member</CardTitle>
          <CardDescription>
            Select an active course offering and an active faculty account.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-5">
          {offerings.length === 0 || faculty.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {offerings.length === 0
                ? 'No active course offerings are available in your authorized scope.'
                : 'No active faculty accounts are available.'}
            </p>
          ) : (
            <form
              onSubmit={handleAssign}
              className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
            >
              <Select
                label="Course offering"
                required
                value={selectedOfferingId}
                options={offeringOptions}
                placeholder="Choose a course offering"
                onChange={(event) => {
                  setSelectedOfferingId(event.target.value)
                  setSelectedFacultyId('')
                  setFeedback(null)
                }}
              />

              <Select
                label="Faculty member"
                required
                value={selectedFacultyId}
                options={facultyOptions}
                placeholder="Choose a faculty member"
                onChange={(event) => {
                  setSelectedFacultyId(event.target.value)
                  setFeedback(null)
                }}
              />

              <Button
                type="submit"
                disabled={
                  !selectedOfferingId ||
                  !selectedFacultyId ||
                  assignMutation.isPending
                }
                isLoading={assignMutation.isPending}
              >
                Assign faculty
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Faculty assignment records</CardTitle>
          <CardDescription>
            View active assignments and historical records for an offering.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-5 space-y-4">
          {!selectedOfferingId ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <BookOpen size={28} className="mx-auto text-slate-400" />
              <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">
                No offering selected
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Choose a course offering above to view its faculty assignments.
              </p>
            </div>
          ) : assignmentsQuery.isPending ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Loading faculty assignments...
            </p>
          ) : assignmentsQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage(assignmentsQuery.error)}
              </p>
              <Button
                variant="outline"
                onClick={() => assignmentsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedOffering?.courseId?.code} —{' '}
                  {selectedOffering?.courseId?.name}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Semester {selectedOffering?.semester} · Section{' '}
                  {selectedOffering?.section} · {selectedOffering?.academicYear}
                </p>
              </div>

              {assignments.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No faculty assignment records exist for this offering.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                        <th className="px-3 py-3">Faculty member</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Assigned on</th>
                        <th className="px-3 py-3 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignments.map((assignment) => {
                        const member = assignment.facultyId
                        const isActive = assignment.isActive

                        return (
                          <tr
                            key={assignment._id}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            <td className="px-3 py-4 font-medium text-slate-900 dark:text-white">
                              {member?.name || 'Unavailable faculty'}
                            </td>

                            <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                              {member?.email || '—'}
                            </td>

                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                  isActive
                                    ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                              {new Date(
                                assignment.createdAt,
                              ).toLocaleDateString()}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {isActive ? (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={deactivateMutation.isPending}
                                  isLoading={
                                    deactivateMutation.isPending &&
                                    deactivateMutation.variables === member?._id
                                  }
                                  onClick={() =>
                                    handleDeactivate(
                                      member?._id,
                                      member?.name || 'this faculty member',
                                    )
                                  }
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  History preserved
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
