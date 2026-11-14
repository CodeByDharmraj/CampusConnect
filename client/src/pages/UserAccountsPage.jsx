import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authApi } from '../lib/authApi.js'
import { authOptions, getErrorMessage } from '../lib/pageHelpers.js'

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'admin', label: 'Administrator' },
]

// Mirrors DEPARTMENT_REQUIRED_ROLES on the server.
const DEPARTMENT_ROLES = ['student', 'coordinator']

const initialForm = { name: '', email: '', password: '', role: 'student', departmentId: '' }

function validate(form) {
  const errors = {}

  if (form.name.trim().length < 2) errors.name = 'Enter the full name.'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.'
  if (DEPARTMENT_ROLES.includes(form.role) && !form.departmentId) {
    errors.departmentId = 'Select a department for this role.'
  }

  return errors
}

export default function UserAccountsPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')

  const departmentsQuery = useQuery({
    queryKey: ['departments', accessToken],
    queryFn: async () =>
      (await apiClient.get('/departments', authOptions(accessToken))).data.departments,
    enabled: Boolean(accessToken),
  })

  const usersQuery = useQuery({
    queryKey: ['user-accounts', roleFilter || 'all', accessToken],
    queryFn: async () => {
      const query = roleFilter ? `?role=${encodeURIComponent(roleFilter)}` : ''

      return (await apiClient.get(`/auth/users${query}`, authOptions(accessToken))).data.users
    },
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => authApi.provisionUser(payload, accessToken),
    onSuccess: async () => {
      setForm((current) => ({ ...initialForm, role: current.role }))
      setFeedback({ type: 'success', message: 'Account created successfully.' })
      await queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['faculty-accounts'] })
    },
    onError: (error) => setFeedback({ type: 'error', message: getErrorMessage(error) }),
  })

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
    }

    if (DEPARTMENT_ROLES.includes(form.role)) payload.departmentId = form.departmentId

    createMutation.mutate(payload)
  }

  const departments = (departmentsQuery.data ?? []).filter((department) => department.isActive)
  const users = usersQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">User Accounts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create student, faculty, coordinator and administrator accounts.
        </p>
      </header>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus size={18} aria-hidden="true" /> New account
          </CardTitle>
          <CardDescription>Students and coordinators belong to a department.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={form.name} onChange={setField('name')} error={errors.name} required />
              <Input label="Email" type="email" value={form.email} onChange={setField('email')} error={errors.email} required />
              <Input label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={setField('password')} error={errors.password} required />
              <Select label="Role" options={ROLE_OPTIONS} value={form.role} onChange={setField('role')} required />
              {DEPARTMENT_ROLES.includes(form.role) ? (
                <Select
                  label="Department"
                  options={departments.map((department) => ({
                    value: department._id,
                    label: `${department.name} (${department.code})`,
                  }))}
                  value={form.departmentId}
                  onChange={setField('departmentId')}
                  error={errors.departmentId}
                  required
                />
              ) : null}
            </div>
            {feedback ? (
              <p role={feedback.type === 'error' ? 'alert' : 'status'}
                className={feedback.type === 'error' ? 'text-sm text-red-700 dark:text-red-300' : 'text-sm text-green-700 dark:text-green-300'}>
                {feedback.message}
              </p>
            ) : null}
            <Button type="submit" isLoading={createMutation.isPending}>Create account</Button>
          </form>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} aria-hidden="true" /> Accounts
            </CardTitle>
            <div className="w-48">
              <Select
                label="Filter by role"
                placeholder="All roles"
                options={ROLE_OPTIONS}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <p role="status" className="text-sm text-slate-600">Loading accounts…</p>
          ) : usersQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(usersQuery.error)}</p>
          ) : users.length === 0 ? (
            <EmptyState title="No accounts found" description="Try a different role filter." />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((account) => (
                <li key={account._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{account.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {account.email}
                      {account.departmentId?.code ? ` · ${account.departmentId.code}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="info">{account.role}</StatusBadge>
                    <StatusBadge variant={account.isActive ? 'success' : 'secondary'}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
