import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, UserPlus, Users } from 'lucide-react'

import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/Card.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAuth } from '../context/useAuth.js'
import { authApi } from '../lib/authApi.js'
import { apiClient } from '../lib/apiClient.js'

function getErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}

const initialForm = {
  name: '',
  email: '',
  password: '',
}

export default function FacultyManagementPage() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  const [form, setForm] = useState(initialForm)
  const [feedback, setFeedback] = useState(null)

  const facultyQuery = useQuery({
    queryKey: ['faculty-accounts', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/auth/faculty', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data.faculty
    },
    enabled: Boolean(accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (userData) =>
      authApi.provisionUser(
        {
          ...userData,
          role: 'faculty',
        },
        accessToken,
      ),

    onSuccess: async () => {
      setForm(initialForm)
      setFeedback({
        type: 'success',
        message: 'Faculty account created successfully.',
      })

      await queryClient.invalidateQueries({
        queryKey: ['faculty-accounts'],
      })
    },

    onError: (error) => {
      setFeedback({
        type: 'error',
        message: getErrorMessage(error),
      })
    },
  })

  const faculty = facultyQuery.data ?? []
  const activeCount = faculty.filter((member) => member.isActive).length
  const inactiveCount = faculty.length - activeCount

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Institutional administration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Faculty Management
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create faculty accounts and review their account status.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="lg">
          <CardDescription>Total faculty accounts</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {faculty.length}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Active faculty</CardDescription>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {activeCount}
          </p>
        </Card>

        <Card padding="lg">
          <CardDescription>Inactive faculty</CardDescription>
          <p className="mt-2 text-3xl font-bold text-slate-500">
            {inactiveCount}
          </p>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
              <UserPlus size={20} />
            </span>

            <div>
              <CardTitle>Create faculty account</CardTitle>
              <CardDescription>
                New accounts are created as active faculty users.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="mt-5">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter faculty name"
              minLength={2}
              maxLength={100}
              autoComplete="name"
              required
            />

            <Input
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="faculty@university.edu"
              autoComplete="email"
              required
            />

            <Input
              label="Temporary password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              minLength={8}
              autoComplete="new-password"
              required
            />

            <div className="flex items-end">
              <Button
                type="submit"
                fullWidth
                isLoading={createMutation.isPending}
                disabled={
                  !form.name.trim() ||
                  !form.email.trim() ||
                  form.password.length < 8
                }
                leftIcon={<UserPlus size={17} />}
              >
                Create faculty account
              </Button>
            </div>
          </form>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            The password is securely hashed by the backend before storage. Share
            temporary credentials with the faculty member securely.
          </p>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Faculty directory</CardTitle>
              <CardDescription>
                Review all registered faculty accounts.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={15} />}
              disabled={facultyQuery.isFetching}
              isLoading={facultyQuery.isFetching}
              onClick={() => facultyQuery.refetch()}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="mt-5">
          {facultyQuery.isPending ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading faculty accounts...
            </p>
          ) : facultyQuery.isError ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage(facultyQuery.error)}
              </p>

              <Button variant="outline" onClick={() => facultyQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : faculty.length === 0 ? (
            <div className="py-10 text-center">
              <Users
                size={32}
                className="mx-auto text-slate-400"
                aria-hidden="true"
              />

              <p className="mt-3 font-medium text-slate-800 dark:text-white">
                No faculty accounts found
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create your first faculty account using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                    <th className="px-3 py-3">Faculty member</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {faculty.map((member) => (
                    <tr
                      key={member._id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-4 font-medium text-slate-900 dark:text-white">
                        {member.name}
                      </td>

                      <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                        {member.email}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge
                          variant={member.isActive ? 'success' : 'secondary'}
                        >
                          {member.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>

                      <td className="px-3 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
