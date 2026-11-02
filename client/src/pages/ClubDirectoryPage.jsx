import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../context/useAuth'
import { apiClient } from '../lib/apiClient'

const categories = [
  'Technical',
  'Cultural',
  'Sports',
  'Literary',
  'Social',
  'Entrepreneurship',
  'Other',
]

const roleLabels = {
  student: 'Student',
  faculty: 'Faculty',
  coordinator: 'Department Coordinator',
  admin: 'Administrator',
}

function authOptions(accessToken) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
}

function ClubCard({ club }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {club.category}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {club.departmentId?.code || club.departmentId?.name || 'Campus'}
        </span>
      </div>

      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
        {club.name}
      </h2>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {club.description}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {club.coordinatorId?.name
            ? `Coordinator: ${club.coordinatorId.name}`
            : 'Campus club'}
        </span>
        <Link
          to={`/clubs-events/${club.slug}`}
          className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          View club
        </Link>
      </div>
    </article>
  )
}

export function ClubDirectoryPage() {
  const { user, accessToken } = useAuth()
  const role = user?.role
  const canManage = ['admin', 'coordinator'].includes(role)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [feedback, setFeedback] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Technical',
    departmentId: '',
  })

  const options = authOptions(accessToken)

  const clubsQuery = useQuery({
    queryKey: ['clubs', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/clubs', options)
      return response.data.data.clubs
    },
    enabled: Boolean(accessToken),
  })

  const departmentsQuery = useQuery({
    queryKey: ['club-departments', accessToken],
    queryFn: async () => {
      const response = await apiClient.get('/departments', options)
      return response.data.data.departments.filter((department) => department.isActive)
    },
    enabled: Boolean(accessToken) && role === 'admin',
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/clubs', payload, options)
      return response.data.data.club
    },
    onSuccess: async () => {
      setForm({
        name: '',
        description: '',
        category: 'Technical',
        departmentId: '',
      })
      setFeedback({ type: 'success', message: 'Club created successfully.' })
      await queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to create this club.',
      })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (clubId) => {
      await apiClient.patch(`/clubs/${clubId}/deactivate`, {}, options)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Club deactivated.' })
      await queryClient.invalidateQueries({ queryKey: ['clubs'] })
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to deactivate this club.',
      })
    },
  })

  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data])
  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase()
    return clubs.filter((club) => {
      const matchesText =
        !term ||
        club.name.toLowerCase().includes(term) ||
        club.description.toLowerCase().includes(term) ||
        club.departmentId?.name?.toLowerCase().includes(term)

      return matchesText &&
        (categoryFilter === 'all' || club.category === categoryFilter)
    })
  }, [clubs, search, categoryFilter])

  function handleCreate(event) {
    event.preventDefault()
    setFeedback(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
    }

    if (role === 'admin') {
      if (!form.departmentId) {
        setFeedback({ type: 'error', message: 'Select a department for this club.' })
        return
      }
      payload.departmentId = form.departmentId
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
          CampusConnect · Campus life
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Clubs & Communities
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Discover student communities, explore their activities, and find a place to contribute beyond the classroom.
        </p>
        <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Signed in as: {roleLabels[role] || 'User'}
        </span>
      </header>

      {canManage && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Create a club
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {role === 'coordinator'
              ? 'The club will automatically belong to your assigned department.'
              : 'Choose the department responsible for this club.'}
          </p>

          <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Club name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                minLength={3}
                maxLength={100}
                required
                placeholder="e.g. Coding Club"
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Category
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            {role === 'admin' && (
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
                Department
                <select
                  value={form.departmentId}
                  onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                  required
                  disabled={departmentsQuery.isPending || departmentsQuery.isError}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select department</option>
                  {(departmentsQuery.data ?? []).map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
                {departmentsQuery.isError && (
                  <span className="mt-1 block text-xs font-normal text-red-600">
                    Unable to load departments.
                  </span>
                )}
              </label>
            )}

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                minLength={20}
                maxLength={2000}
                rows={4}
                required
                placeholder="Describe the club's purpose, interests, and activities..."
                className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <span className="mt-1 block text-right text-xs font-normal text-slate-500">
                {form.description.length}/2000
              </span>
            </label>

            {feedback && (
              <p
                role={feedback.type === 'error' ? 'alert' : 'status'}
                className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 sm:col-span-2"
              >
                {feedback.message}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={createMutation.isPending || (role === 'admin' && (departmentsQuery.isPending || departmentsQuery.isError || !(departmentsQuery.data ?? []).length))}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create club'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Explore clubs</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {clubs.length} active {clubs.length === 1 ? 'club' : 'clubs'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clubs..."
              aria-label="Search clubs"
              className="w-52 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter clubs by category"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>

        {clubsQuery.isPending && <p role="status" className="text-sm text-slate-500">Loading clubs...</p>}
        {clubsQuery.isError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            Unable to load the club directory.
            <button type="button" onClick={() => clubsQuery.refetch()} className="ml-2 font-semibold underline">Try again</button>
          </p>
        )}

        {!clubsQuery.isPending && !clubsQuery.isError && filteredClubs.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
            {clubs.length ? 'No clubs match your search.' : 'No active clubs have been added yet.'}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClubs.map((club) => (
            <div key={club._id} className="relative">
              <ClubCard club={club} />
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Deactivate ${club.name}? It will no longer appear in the directory.`)) {
                      deactivateMutation.mutate(club._id)
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  className="absolute right-5 top-[4.1rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ClubDetailPage() {
  const { slug } = useParams()
  const { accessToken } = useAuth()

  const clubQuery = useQuery({
    queryKey: ['club', slug, accessToken],
    queryFn: async () => {
      const response = await apiClient.get(
        `/clubs/${slug}`,
        authOptions(accessToken),
      )
      return response.data.data.club
    },
    enabled: Boolean(accessToken && slug),
  })

  if (clubQuery.isPending) {
    return <p role="status" className="text-sm text-slate-500">Loading club...</p>
  }

  if (clubQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Club unavailable</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This club may have been deactivated or the link may be incorrect.
        </p>
        <Link to="/clubs-events" className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400">
          Back to clubs
        </Link>
      </section>
    )
  }

  const club = clubQuery.data

  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9 dark:border-slate-800 dark:bg-slate-900">
      <Link to="/clubs-events" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400">
        ← All clubs
      </Link>
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{club.category}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{club.departmentId?.name}</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{club.name}</h1>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{club.description}</p>
      <dl className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{club.departmentId?.name || 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coordinator</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{club.coordinatorId?.name || 'Department coordination'}</dd>
        </div>
      </dl>
    </article>
  )
}
