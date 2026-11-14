import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, CalendarPlus, RotateCcw } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Textarea from '../components/Textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authOptions, formatCourse, getErrorMessage } from '../lib/pageHelpers.js'

const emptyCourse = { name: '', code: '', description: '', credits: '3', departmentId: '' }
const emptyOffering = { courseId: '', academicYear: '', semester: '1', section: 'A' }

function Message({ feedback }) {
  if (!feedback) return null

  return (
    <p
      role={feedback.type === 'error' ? 'alert' : 'status'}
      className={feedback.type === 'error' ? 'text-sm text-red-700 dark:text-red-300' : 'text-sm text-green-700 dark:text-green-300'}
    >
      {feedback.message}
    </p>
  )
}

function validateCourse(form, isAdmin) {
  const errors = {}
  const credits = Number(form.credits)

  if (form.name.trim().length < 2 || form.name.trim().length > 150) errors.name = 'Name must be 2–150 characters.'
  if (!/^[A-Z0-9-]{2,20}$/.test(form.code.trim().toUpperCase())) errors.code = 'Code must be 2–20 letters, numbers or hyphens.'
  if (!Number.isInteger(credits) || credits < 1 || credits > 10) errors.credits = 'Credits must be a whole number from 1 to 10.'
  if (form.description.trim().length > 500) errors.description = 'Description cannot exceed 500 characters.'
  if (isAdmin && !form.departmentId) errors.departmentId = 'Select a department.'

  return errors
}

function validateOffering(form) {
  const errors = {}
  const match = form.academicYear.trim().match(/^(\d{4})-(\d{4})$/)

  if (!form.courseId) errors.courseId = 'Select a course.'
  if (!match || Number(match[2]) !== Number(match[1]) + 1) errors.academicYear = 'Use the format 2026-2027.'
  if (!/^[A-Z0-9-]{1,10}$/.test(form.section.trim().toUpperCase())) errors.section = 'Section must be 1–10 letters or numbers.'

  return errors
}

export default function CourseCatalogPage() {
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const options = authOptions(accessToken)

  const [courseForm, setCourseForm] = useState(emptyCourse)
  const [courseErrors, setCourseErrors] = useState({})
  const [courseFeedback, setCourseFeedback] = useState(null)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [offeringForm, setOfferingForm] = useState(emptyOffering)
  const [offeringErrors, setOfferingErrors] = useState({})
  const [offeringFeedback, setOfferingFeedback] = useState(null)
  const [reasons, setReasons] = useState({})
  const [requestFeedback, setRequestFeedback] = useState(null)

  const coursesQuery = useQuery({
    queryKey: ['catalog', 'courses', accessToken],
    queryFn: async () => (await apiClient.get('/courses', options)).data.courses,
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', accessToken],
    queryFn: async () => (await apiClient.get('/departments', options)).data.departments,
    enabled: Boolean(accessToken && isAdmin),
  })

  const offeringsQuery = useQuery({
    queryKey: ['catalog', 'offerings', accessToken],
    queryFn: async () => (await apiClient.get('/course-offerings', options)).data.offerings,
    enabled: Boolean(accessToken),
  })

  const requestsQuery = useQuery({
    queryKey: ['catalog', 'reactivation-requests', accessToken],
    queryFn: async () => (await apiClient.get('/course-offerings/reactivation-requests', options)).data.requests,
    enabled: Boolean(accessToken),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['catalog'] })

  const createCourse = useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? apiClient.patch(`/courses/${encodeURIComponent(id)}`, payload, options)
        : apiClient.post('/courses', payload, options),
    onSuccess: async (_data, variables) => {
      setCourseForm(emptyCourse)
      setEditingCourseId(null)
      setCourseFeedback({
        type: 'success',
        message: variables.id ? 'Course updated successfully.' : 'Course created successfully.',
      })
      await refresh()
    },
    onError: (error) => setCourseFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const deactivateCourse = useMutation({
    mutationFn: (courseId) => apiClient.patch(`/courses/${encodeURIComponent(courseId)}/deactivate`, {}, options),
    onSuccess: refresh,
    onError: (error) => setCourseFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const createOffering = useMutation({
    mutationFn: (payload) => apiClient.post('/course-offerings', payload, options),
    onSuccess: async () => {
      setOfferingForm((current) => ({ ...emptyOffering, academicYear: current.academicYear }))
      setOfferingFeedback({ type: 'success', message: 'Course offering created successfully.' })
      await refresh()
    },
    onError: (error) => setOfferingFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const deactivateOffering = useMutation({
    mutationFn: (offeringId) => apiClient.patch(`/course-offerings/${encodeURIComponent(offeringId)}/deactivate`, {}, options),
    onSuccess: refresh,
    onError: (error) => setOfferingFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const requestReactivation = useMutation({
    mutationFn: ({ offeringId, reason }) =>
      apiClient.post(`/course-offerings/${encodeURIComponent(offeringId)}/reactivation-requests`, { reason }, options),
    onSuccess: async (_data, variables) => {
      setReasons((current) => ({ ...current, [variables.offeringId]: '' }))
      setRequestFeedback({ type: 'success', message: 'Reactivation request sent to the administrators.' })
      await refresh()
    },
    onError: (error) => setRequestFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const decideRequest = useMutation({
    mutationFn: ({ requestId, decision, reason }) =>
      apiClient.patch(`/course-offerings/reactivation-requests/${encodeURIComponent(requestId)}/${decision}`, { reason }, options),
    onSuccess: async (_data, variables) => {
      setReasons((current) => ({ ...current, [variables.requestId]: '' }))
      setRequestFeedback({ type: 'success', message: 'Decision recorded.' })
      await refresh()
    },
    onError: (error) => setRequestFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const courses = coursesQuery.data ?? []
  const offerings = offeringsQuery.data ?? []
  const requests = requestsQuery.data ?? []
  const activeCourses = courses.filter((course) => course.isActive)
  const inactiveOfferings = offerings.filter((offering) => !offering.isActive)
  const pendingByOffering = new Set(
    requests.filter((request) => request.status === 'pending').map((request) => request.courseOfferingId?._id),
  )

  function submitCourse(event) {
    event.preventDefault()
    setCourseFeedback(null)
    const errors = validateCourse(courseForm, isAdmin && !editingCourseId)
    setCourseErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      name: courseForm.name.trim(),
      code: courseForm.code.trim().toUpperCase(),
      credits: Number(courseForm.credits),
    }
    if (courseForm.description.trim()) payload.description = courseForm.description.trim()
    // The department is fixed when the course is created.
    if (isAdmin && !editingCourseId) payload.departmentId = courseForm.departmentId

    createCourse.mutate({ id: editingCourseId, payload })
  }

  function submitOffering(event) {
    event.preventDefault()
    setOfferingFeedback(null)
    const errors = validateOffering(offeringForm)
    setOfferingErrors(errors)
    if (Object.keys(errors).length > 0) return

    createOffering.mutate({
      courseId: offeringForm.courseId,
      academicYear: offeringForm.academicYear.trim(),
      semester: Number(offeringForm.semester),
      section: offeringForm.section.trim().toUpperCase(),
    })
  }

  const setCourse = (field) => (event) => setCourseForm((current) => ({ ...current, [field]: event.target.value }))
  const setOffering = (field) => (event) => setOfferingForm((current) => ({ ...current, [field]: event.target.value }))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Course Catalogue</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage courses, create term offerings and handle reactivation requests.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen size={18} aria-hidden="true" /> {editingCourseId ? 'Edit course' : 'Add course'}</CardTitle>
            {!isAdmin ? <CardDescription>New courses are added to your department.</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <form onSubmit={submitCourse} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" value={courseForm.name} onChange={setCourse('name')} error={courseErrors.name} required />
                <Input label="Code" value={courseForm.code} onChange={setCourse('code')} error={courseErrors.code} required />
                <Input label="Credits" type="number" min="1" max="10" value={courseForm.credits} onChange={setCourse('credits')} error={courseErrors.credits} required />
                {isAdmin && !editingCourseId ? (
                  <Select
                    label="Department"
                    options={(departmentsQuery.data ?? []).filter((d) => d.isActive).map((d) => ({ value: d._id, label: `${d.name} (${d.code})` }))}
                    value={courseForm.departmentId}
                    onChange={setCourse('departmentId')}
                    error={courseErrors.departmentId}
                    required
                  />
                ) : null}
              </div>
              <Textarea label="Description" rows={2} value={courseForm.description} onChange={setCourse('description')} error={courseErrors.description} />
              <Message feedback={courseFeedback} />
              <div className="flex gap-2">
                <Button type="submit" isLoading={createCourse.isPending}>
                  {editingCourseId ? 'Save changes' : 'Create course'}
                </Button>
                {editingCourseId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingCourseId(null)
                      setCourseForm(emptyCourse)
                      setCourseErrors({})
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarPlus size={18} aria-hidden="true" /> Add offering</CardTitle>
            <CardDescription>An offering is a course taught in a specific term and section.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitOffering} className="space-y-4" noValidate>
              <Select
                label="Course"
                options={activeCourses.map((course) => ({ value: course._id, label: formatCourse(course) }))}
                value={offeringForm.courseId}
                onChange={setOffering('courseId')}
                error={offeringErrors.courseId}
                required
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Academic year" placeholder="2026-2027" value={offeringForm.academicYear} onChange={setOffering('academicYear')} error={offeringErrors.academicYear} required />
                <Select
                  label="Semester"
                  options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: `Semester ${index + 1}` }))}
                  value={offeringForm.semester}
                  onChange={setOffering('semester')}
                  required
                />
                <Input label="Section" value={offeringForm.section} onChange={setOffering('section')} error={offeringErrors.section} required />
              </div>
              <Message feedback={offeringFeedback} />
              <Button type="submit" isLoading={createOffering.isPending}>Create offering</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader><CardTitle className="text-base">Courses</CardTitle></CardHeader>
        <CardContent>
          {coursesQuery.isLoading ? <p role="status" className="text-sm text-slate-600">Loading courses…</p>
            : coursesQuery.isError ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(coursesQuery.error)}</p>
            : courses.length === 0 ? <EmptyState title="No courses yet" description="Add the first course using the form above." />
            : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {courses.map((course) => (
                  <li key={course._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{formatCourse(course)}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{course.credits} credits</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={course.isActive ? 'success' : 'secondary'}>{course.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                      {course.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCourseId(course._id)
                            setCourseFeedback(null)
                            setCourseErrors({})
                            setCourseForm({
                              name: course.name ?? '',
                              code: course.code ?? '',
                              description: course.description ?? '',
                              credits: String(course.credits ?? 3),
                              departmentId: '',
                            })
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {course.isActive ? (
                        <Button size="sm" variant="outline" isLoading={deactivateCourse.isPending && deactivateCourse.variables === course._id} onClick={() => deactivateCourse.mutate(course._id)}>
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader><CardTitle className="text-base">Offerings</CardTitle></CardHeader>
        <CardContent>
          {offeringsQuery.isLoading ? <p role="status" className="text-sm text-slate-600">Loading offerings…</p>
            : offerings.length === 0 ? <EmptyState title="No offerings yet" description="Create an offering for an active course." />
            : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {offerings.map((offering) => (
                  <li key={offering._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{formatCourse(offering.courseId)}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Semester {offering.semester} · Section {offering.section} · {offering.academicYear}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={offering.isActive ? 'success' : 'secondary'}>{offering.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                      {offering.isActive ? (
                        <Button size="sm" variant="outline" isLoading={deactivateOffering.isPending && deactivateOffering.variables === offering._id} onClick={() => deactivateOffering.mutate(offering._id)}>
                          Deactivate
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><RotateCcw size={18} aria-hidden="true" /> Reactivation</CardTitle>
          <CardDescription>
            {isAdmin ? 'Review requests from coordinators to reactivate inactive offerings.' : 'Ask an administrator to reactivate an inactive offering in your department.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Message feedback={requestFeedback} />

          {!isAdmin && inactiveOfferings.length > 0 ? (
            <ul className="space-y-4">
              {inactiveOfferings.filter((offering) => !pendingByOffering.has(offering._id)).map((offering) => (
                <li key={offering._id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatCourse(offering.courseId)} · Sem {offering.semester} · {offering.section} · {offering.academicYear}
                  </p>
                  <Textarea
                    label="Reason (10–1000 characters)"
                    rows={2}
                    value={reasons[offering._id] ?? ''}
                    onChange={(event) => setReasons((current) => ({ ...current, [offering._id]: event.target.value }))}
                  />
                  <Button
                    size="sm"
                    isLoading={requestReactivation.isPending && requestReactivation.variables?.offeringId === offering._id}
                    disabled={(reasons[offering._id] ?? '').trim().length < 10}
                    onClick={() => requestReactivation.mutate({ offeringId: offering._id, reason: reasons[offering._id].trim() })}
                  >
                    Request reactivation
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {requestsQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(requestsQuery.error)}</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No reactivation requests yet.</p>
          ) : (
            <ul className="space-y-4">
              {requests.map((request) => {
                const offering = request.courseOfferingId
                const pending = request.status === 'pending'

                return (
                  <li key={request._id} className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCourse(offering?.courseId)} · Sem {offering?.semester} · {offering?.section} · {offering?.academicYear}
                      </p>
                      <StatusBadge variant={pending ? 'warning' : request.status === 'approved' ? 'success' : 'danger'}>{request.status}</StatusBadge>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">“{request.requestReason}” — {request.requestedBy?.name}</p>
                    {request.decisionReason ? <p className="text-sm text-slate-600 dark:text-slate-400">Decision: {request.decisionReason}</p> : null}
                    {isAdmin && pending ? (
                      <div className="space-y-2">
                        <Textarea
                          label="Decision note (10–1000 characters)"
                          rows={2}
                          value={reasons[request._id] ?? ''}
                          onChange={(event) => setReasons((current) => ({ ...current, [request._id]: event.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={(reasons[request._id] ?? '').trim().length < 10} onClick={() => decideRequest.mutate({ requestId: request._id, decision: 'approve', reason: reasons[request._id].trim() })}>Approve</Button>
                          <Button size="sm" variant="danger" disabled={(reasons[request._id] ?? '').trim().length < 10} onClick={() => decideRequest.mutate({ requestId: request._id, decision: 'reject', reason: reasons[request._id].trim() })}>Reject</Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
