import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Activity, BookOpen, Building2, Users } from 'lucide-react'

import StatusBadge from '../components/StatusBadge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authOptions, getErrorMessage } from '../lib/pageHelpers.js'

const ROLE_LABELS = [
  ['student', 'Students'],
  ['faculty', 'Faculty'],
  ['coordinator', 'Coordinators'],
  ['admin', 'Administrators'],
]

const ADMIN_TOOLS = [
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/user-accounts', label: 'User accounts', icon: Users },
  { to: '/course-catalog', label: 'Course catalogue', icon: BookOpen },
  { to: '/faculty-course-management', label: 'Faculty assignments', icon: Users },
  { to: '/enrollments', label: 'Enrollments', icon: Users },
]

export default function InstitutionalSettingsPage() {
  const { accessToken } = useAuth()

  const healthQuery = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: async () => (await apiClient.get('/health/ready')).data,
    retry: false,
    refetchInterval: 60_000,
  })

  const usersQuery = useQuery({
    queryKey: ['user-accounts', 'all', accessToken],
    queryFn: async () => (await apiClient.get('/auth/users', authOptions(accessToken))).data.users,
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['departments', accessToken],
    queryFn: async () => (await apiClient.get('/departments', authOptions(accessToken))).data.departments,
    enabled: Boolean(accessToken),
  })

  const users = usersQuery.data ?? []
  const ready = healthQuery.data?.status === 'ready'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Institutional Settings
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Live system status, institution-wide totals and shortcuts to the administration tools.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity size={18} aria-hidden="true" /> System status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <p role="status" className="text-sm text-slate-600">Checking…</p>
            ) : (
              <StatusBadge variant={ready ? 'success' : 'danger'}>
                {ready ? 'API and database ready' : 'Service unavailable'}
              </StatusBadge>
            )}
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle className="text-base">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              {departmentsQuery.isLoading ? '…' : (departmentsQuery.data ?? []).length}
            </p>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              {usersQuery.isLoading ? '…' : users.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="text-base">Accounts by role</CardTitle>
          <CardDescription>Active and inactive accounts are both counted.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(usersQuery.error)}</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-4">
              {ROLE_LABELS.map(([role, label]) => (
                <div key={role}>
                  <dt className="text-sm text-slate-600 dark:text-slate-400">{label}</dt>
                  <dd className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {users.filter((account) => account.role === role).length}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="text-base">Administration tools</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ADMIN_TOOLS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <Icon size={18} aria-hidden="true" /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
