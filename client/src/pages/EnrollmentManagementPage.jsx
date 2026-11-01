import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../lib/apiClient.js'
import Button from '../components/Button.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/Card.jsx'
import Select from '../components/Select.jsx'
import { useAuth } from '../context/useAuth.js'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatOffering(offering) {
  const course = offering.courseId

  return `${course.code} — ${course.name} | Semester ${offering.semester} | Section ${offering.section} | ${offering.academicYear}`
}

export default function EnrollmentManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [feedback, setFeedback] = useState(null)

  const optionsQuery = useQuery({
    queryKey: ['enrollment-options', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/enrollments/options', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data
    },
    enabled: Boolean(accessToken),
  })

  const enrollmentQuery = useQuery({
    queryKey: ['offering-enrollments', selectedOfferingId, accessToken],
    queryFn: async () => {
      const response = await apiClient.get(
        `/enrollments/offerings/${selectedOfferingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      return response.data
    },
    enabled: Boolean(selectedOfferingId && accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (input) =>
      apiClient.post('/enrollments', input, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    onSuccess: async (response) => {
      setSelectedStudentId('')
      setFeedback({
        type: 'success',
        message: 'Student enrollment saved successfully.',
      })

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['offering-enrollments', selectedOfferingId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['enrollment-options'],
        }),
      ])

      return response
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error) })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (enrollmentId) =>
      apiClient.delete(`/enrollments/${enrollmentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    onSuccess: async () => {
      setFeedback({
        type: 'success',
        message: 'Enrollment withdrawn. Its academic history is preserved.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['offering-enrollments', selectedOfferingId],
      })
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getErrorMessage(error) })
    },
  })

  const students = optionsQuery.data?.students ?? []
  const offerings = optionsQuery.data?.offerings ?? []
  const enrollments = enrollmentQuery.data?.enrollments ?? []
  const selectedOffering = enrollmentQuery.data?.offering

  const studentOptions = students.map((student) => ({
    value: student._id,
    label: `${student.name} — ${student.email}`,
  }))

  const offeringOptions = offerings.map((offering) => ({
    value: offering._id,
    label: formatOffering(offering),
  }))

  const enrolledCount = enrollments.filter(
    (enrollment) => enrollment.status === 'enrolled',
  ).length

  function handleAddEnrollment(event) {
    event.preventDefault()
    setFeedback(null)

    if (!selectedOfferingId || !selectedStudentId) {
      setFeedback({
        type: 'error',
        message: 'Select both a student and a course offering.',
      })
      return
    }

    createMutation.mutate({
      studentId: selectedStudentId,
      courseOfferingId: selectedOfferingId,
    })
  }

  function handleWithdraw(enrollmentId, studentName) {
    const confirmed = window.confirm(
      `Withdraw ${studentName} from this course offering? The enrollment record will be preserved.`,
    )

    if (!confirmed) return

    setFeedback(null)
    withdrawMutation.mutate(enrollmentId)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Academic administration
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Enrollment Management
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enroll active students in course offerings and manage their enrollment
          status.
        </p>
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

      {optionsQuery.isPending ? (
        <Card padding="lg">
          <CardContent>Loading enrollment options...</CardContent>
        </Card>
      ) : optionsQuery.isError ? (
        <Card padding="lg">
          <CardContent className="space-y-3">
            <p className="text-red-600 dark:text-red-400">
              {getErrorMessage(optionsQuery.error)}
            </p>
            <Button variant="outline" onClick={() => optionsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="lg">
              <CardDescription>Active students loaded</CardDescription>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {students.length}
              </p>
            </Card>

            <Card padding="lg">
              <CardDescription>Active offerings loaded</CardDescription>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {offerings.length}
              </p>
            </Card>

            <Card padding="lg">
              <CardDescription>Currently enrolled</CardDescription>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {selectedOfferingId ? enrolledCount : '—'}
              </p>
            </Card>
          </div>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Add student enrollment</CardTitle>
              <CardDescription>
                Select an active offering and an active student. Previously
                withdrawn students can be re-enrolled.
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-5">
              {offerings.length === 0 || students.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {offerings.length === 0
                    ? 'No active course offerings with active parent courses are available.'
                    : 'No active student accounts are available.'}
                </p>
              ) : (
                <form
                  onSubmit={handleAddEnrollment}
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
                      setFeedback(null)
                    }}
                  />

                  <Select
                    label="Student"
                    required
                    value={selectedStudentId}
                    options={studentOptions}
                    placeholder="Choose a student"
                    onChange={(event) =>
                      setSelectedStudentId(event.target.value)
                    }
                  />

                  <Button
                    type="submit"
                    disabled={
                      !selectedOfferingId ||
                      !selectedStudentId ||
                      createMutation.isPending
                    }
                    isLoading={createMutation.isPending}
                  >
                    Add enrollment
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Enrollment records</CardTitle>
              <CardDescription>
                Select an offering to view its current and historical
                enrollments.
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-5 space-y-4">
              {!selectedOfferingId ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    No offering selected
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose a course offering above to view its enrollment
                    records.
                  </p>
                </div>
              ) : enrollmentQuery.isPending ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Loading enrollment records...
                </p>
              ) : enrollmentQuery.isError ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {getErrorMessage(enrollmentQuery.error)}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => enrollmentQuery.refetch()}
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
                      {selectedOffering?.section} ·{' '}
                      {selectedOffering?.academicYear}
                    </p>
                  </div>

                  {enrollments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No enrollment records exist for this offering.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                            <th className="px-3 py-3">Student</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Enrolled on</th>
                            <th className="px-3 py-3 text-right">Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {enrollments.map((enrollment) => {
                            const student = enrollment.studentId
                            const isEnrolled = enrollment.status === 'enrolled'

                            return (
                              <tr
                                key={enrollment._id}
                                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                              >
                                <td className="px-3 py-4 font-medium text-slate-900 dark:text-white">
                                  {student?.name || 'Unavailable student'}
                                </td>
                                <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                                  {student?.email || '—'}
                                </td>
                                <td className="px-3 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                      enrollment.status === 'enrolled'
                                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                                        : enrollment.status === 'completed'
                                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {enrollment.status}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                                  {new Date(
                                    enrollment.createdAt,
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-4 text-right">
                                  {isEnrolled ? (
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      disabled={withdrawMutation.isPending}
                                      isLoading={
                                        withdrawMutation.isPending &&
                                        withdrawMutation.variables ===
                                          enrollment._id
                                      }
                                      onClick={() =>
                                        handleWithdraw(
                                          enrollment._id,
                                          student?.name || 'this student',
                                        )
                                      }
                                    >
                                      Withdraw
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      No action
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
        </>
      )}
    </div>
  )
}
