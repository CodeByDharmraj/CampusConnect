import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  CalendarClock,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Send,
} from 'lucide-react'

import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
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

const initialForm = {
  courseOfferingId: '',
  title: '',
  description: '',
  instructions: '',
  dueDate: '',
}

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

function formatOffering(offering) {
  const course = offering.courseOffering?.courseId

  return `${course?.code || 'Course'} — ${course?.name || 'Unknown'} | Semester ${offering.courseOffering?.semester} | Section ${offering.courseOffering?.section} | ${offering.courseOffering?.academicYear}`
}

function formatDate(value) {
  if (!value) return 'Not specified'

  return new Date(value).toLocaleString()
}

function toLocalDateTime(value) {
  if (!value) return ''

  const date = new Date(value)

  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function AssignmentCard({ assignment, onEdit, onPublish, publishing }) {
  const isDraft = assignment.status === 'draft'

  return (
    <Card padding="lg">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <FileText size={20} />
            </span>

            <div>
              <CardTitle className="text-base">{assignment.title}</CardTitle>

              <CardDescription className="mt-1">
                {assignment.courseOfferingId?.courseId?.code} · Semester{' '}
                {assignment.courseOfferingId?.semester} · Section{' '}
                {assignment.courseOfferingId?.section}
              </CardDescription>
            </div>
          </div>

          <StatusBadge variant={isDraft ? 'warning' : 'success'}>
            {isDraft ? 'Draft' : 'Published'}
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

            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {assignment.instructions}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <CalendarClock size={14} className="mr-1 inline" />
            Deadline: {formatDate(assignment.dueDate)}
          </div>

          {isDraft && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Pencil size={14} />}
                onClick={() => onEdit(assignment)}
              >
                Edit
              </Button>

              <Button
                size="sm"
                leftIcon={<Send size={14} />}
                isLoading={
                  publishing && publishing.variables === assignment._id
                }
                disabled={publishing.isPending}
                onClick={() => onPublish(assignment._id)}
              >
                Publish
              </Button>
            </div>
          )}
        </div>

        {!isDraft && assignment.publishedAt && (
          <p className="text-xs text-green-700 dark:text-green-400">
            Published on {formatDate(assignment.publishedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AssignmentManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  // Load the authenticated faculty member's assigned courses.
  const coursesQuery = useQuery({
    queryKey: ['my-courses', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/courses/my', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data.courses
    },
    enabled: Boolean(accessToken),
  })

  // Load assignments visible to the authenticated faculty member.
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

  const createMutation = useMutation({
    mutationFn: (input) =>
      apiClient.post('/assignments', input, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),

    onSuccess: async () => {
      setForm(initialForm)
      setFeedback({
        type: 'success',
        message: 'Assignment draft created successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['assignments'],
      })
    },

    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ assignmentId, input }) =>
      apiClient.patch(`/assignments/${assignmentId}`, input, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),

    onSuccess: async () => {
      setForm(initialForm)
      setEditingId(null)

      setFeedback({
        type: 'success',
        message: 'Assignment draft updated successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['assignments'],
      })
    },

    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (assignmentId) =>
      apiClient.patch(
        `/assignments/${assignmentId}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),

    onSuccess: async () => {
      setFeedback({
        type: 'success',
        message: 'Assignment published successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['assignments'],
      })
    },

    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const courses = coursesQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  const drafts = assignments.filter(
    (assignment) => assignment.status === 'draft',
  )

  const published = assignments.filter(
    (assignment) => assignment.status === 'published',
  )

  const courseOptions = courses.map((course) => ({
    value: course.courseOffering._id,
    label: formatOffering(course),
  }))

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setFeedback(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    if (!form.courseOfferingId) {
      setFeedback({
        type: 'error',
        message: 'Select a course offering.',
      })
      return
    }

    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    }

    if (!editingId) {
      createMutation.mutate({
        ...input,
        courseOfferingId: form.courseOfferingId,
      })
      return
    }

    updateMutation.mutate({
      assignmentId: editingId,
      input,
    })
  }

  function handleEdit(assignment) {
    setEditingId(assignment._id)

    setForm({
      courseOfferingId: assignment.courseOfferingId._id,
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions || '',
      dueDate: toLocalDateTime(assignment.dueDate),
    })

    setFeedback(null)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
    setFeedback(null)
  }

  function handlePublish(assignmentId) {
    const confirmed = window.confirm(
      'Publish this assignment? Enrolled students will be able to see it, and it cannot be edited afterward.',
    )

    if (!confirmed) return

    setFeedback(null)
    publishMutation.mutate(assignmentId)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Faculty workspace
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Assignment Management
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create, manage and publish assignments for your assigned courses.
        </p>
      </header>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
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
          <CardDescription>Assigned courses</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {courses.length}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Draft assignments</CardDescription>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {drafts.length}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Published assignments</CardDescription>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {published.length}
          </p>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              {editingId ? <Pencil size={20} /> : <Plus size={20} />}
            </span>

            <div>
              <CardTitle>
                {editingId ? 'Edit assignment draft' : 'Create assignment'}
              </CardTitle>

              <CardDescription>
                {editingId
                  ? 'Update your unpublished assignment.'
                  : 'New assignments are saved as drafts until you publish them.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-5">
          {coursesQuery.isPending ? (
            <p className="text-sm text-slate-500">
              Loading your assigned courses...
            </p>
          ) : coursesQuery.isError ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                {getErrorMessage(coursesQuery.error)}
              </p>

              <Button variant="outline" onClick={() => coursesQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              You don't have any assigned courses. Contact your coordinator or
              administrator to receive a course assignment.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Select
                label="Course offering"
                required
                disabled={Boolean(editingId)}
                value={form.courseOfferingId}
                options={courseOptions}
                placeholder="Choose an assigned course"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseOfferingId: event.target.value,
                  }))
                }
              />

              <Input
                label="Assignment title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. DSA Assignment 1"
                minLength={3}
                maxLength={150}
                required
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="assignment-description"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Description <span className="text-red-600">*</span>
                </label>

                <textarea
                  id="assignment-description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  maxLength={5000}
                  required
                  placeholder="Describe what students need to complete."
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <p className="text-right text-xs text-slate-500">
                  {form.description.length}/5000
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="assignment-instructions"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Instructions
                </label>

                <textarea
                  id="assignment-instructions"
                  name="instructions"
                  rows={4}
                  value={form.instructions}
                  onChange={handleChange}
                  maxLength={10000}
                  placeholder="Add submission guidelines or other instructions."
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <p className="text-right text-xs text-slate-500">
                  {form.instructions.length}/10000
                </p>
              </div>

              <Input
                label="Submission deadline"
                type="datetime-local"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                hint="A future deadline is mandatory before publishing. You may leave it empty while saving a draft."
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={
                    !form.courseOfferingId ||
                    !form.title.trim() ||
                    !form.description.trim() ||
                    isSaving
                  }
                  isLoading={isSaving}
                  leftIcon={<FileText size={16} />}
                >
                  {editingId ? 'Save changes' : 'Save draft'}
                </Button>

                {editingId && (
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel editing
                  </Button>
                )}

                {!editingId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(initialForm)
                      setFeedback(null)
                    }}
                  >
                    Clear form
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Your assignments
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Draft and published assignments across your assigned courses.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={15} />}
            disabled={assignmentsQuery.isFetching}
            isLoading={assignmentsQuery.isFetching}
            onClick={() => assignmentsQuery.refetch()}
          >
            Refresh
          </Button>
        </div>

        {assignmentsQuery.isPending ? (
          <Card padding="lg">
            <CardContent>Loading assignments...</CardContent>
          </Card>
        ) : assignmentsQuery.isError ? (
          <Card padding="lg">
            <CardContent className="space-y-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage(assignmentsQuery.error)}
              </p>

              <Button
                variant="outline"
                onClick={() => assignmentsQuery.refetch()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : assignments.length === 0 ? (
          <Card padding="lg">
            <CardContent className="py-6 text-center">
              <BookOpen size={30} className="mx-auto text-slate-400" />

              <p className="mt-3 font-medium text-slate-800 dark:text-white">
                No assignments created yet
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create your first assignment using the form above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                onEdit={handleEdit}
                onPublish={handlePublish}
                publishing={publishMutation}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
