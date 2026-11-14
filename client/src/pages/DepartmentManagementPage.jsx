import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Input from '../components/Input.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Textarea from '../components/Textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authOptions, getErrorMessage } from '../lib/pageHelpers.js'

const initialForm = { name: '', code: '', description: '' }

function validate(form) {
  const errors = {}
  const name = form.name.trim()
  const code = form.code.trim().toUpperCase()

  if (name.length < 2 || name.length > 100) {
    errors.name = 'Name must contain between 2 and 100 characters.'
  }

  if (code.length < 2 || code.length > 12 || !/^[A-Z0-9-]+$/.test(code)) {
    errors.code = 'Code must be 2–12 letters, numbers or hyphens.'
  }

  if (form.description.trim().length > 500) {
    errors.description = 'Description cannot exceed 500 characters.'
  }

  return errors
}

export default function DepartmentManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)

  const departmentsQuery = useQuery({
    queryKey: ['departments', accessToken],
    queryFn: async () =>
      (await apiClient.get('/departments', authOptions(accessToken))).data.departments,
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.post('/departments', payload, authOptions(accessToken)),
    onSuccess: async () => {
      setForm(initialForm)
      setFeedback({ type: 'success', message: 'Department created successfully.' })
      await queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    const nextErrors = validate(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase() }
    if (form.description.trim()) payload.description = form.description.trim()

    createMutation.mutate(payload)
  }

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  const departments = departmentsQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Department Management
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create and review the departments that organise courses, coordinators and students.
        </p>
      </header>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus size={18} aria-hidden="true" /> Add department
          </CardTitle>
          <CardDescription>Department codes are unique and stored in capitals.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={form.name} onChange={setField('name')} error={errors.name} required />
              <Input label="Code" value={form.code} onChange={setField('code')} error={errors.code} required />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={setField('description')}
              error={errors.description}
              rows={3}
            />
            {feedback ? (
              <p role={feedback.type === 'error' ? 'alert' : 'status'}
                className={feedback.type === 'error' ? 'text-sm text-red-700 dark:text-red-300' : 'text-sm text-green-700 dark:text-green-300'}>
                {feedback.message}
              </p>
            ) : null}
            <Button type="submit" isLoading={createMutation.isPending}>Create department</Button>
          </form>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 size={18} aria-hidden="true" /> Departments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departmentsQuery.isLoading ? (
            <p role="status" className="text-sm text-slate-600">Loading departments…</p>
          ) : departmentsQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {getErrorMessage(departmentsQuery.error)}
            </p>
          ) : departments.length === 0 ? (
            <EmptyState title="No departments yet" description="Create the first department using the form above." />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {departments.map((department) => (
                <li key={department._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {department.name} <span className="text-slate-500">({department.code})</span>
                    </p>
                    {department.description ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{department.description}</p>
                    ) : null}
                  </div>
                  <StatusBadge variant={department.isActive ? 'success' : 'secondary'}>
                    {department.isActive ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
