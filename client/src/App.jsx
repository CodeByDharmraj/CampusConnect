import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router'

import { queryClient } from './lib/queryClient'
import PlaceholderPage from './pages/PlaceholderPage'

const navigation = [
  { label: 'Dashboard', path: '/', symbol: '⌂' },
  { label: 'My Courses', path: '/courses', symbol: '▤' },
  { label: 'Timetable', path: '/timetable', symbol: '▦' },
  { label: 'Assignments', path: '/assignments', symbol: '✓' },
  { label: 'Attendance', path: '/attendance', symbol: '◷' },
  { label: 'Announcements', path: '/announcements', symbol: '▱' },
  { label: 'Clubs & Events', path: '/clubs-events', symbol: '☆' },
]

const placeholderPages = [
  {
    path: '/courses',
    title: 'My Courses',
    description: 'Access your enrolled courses and academic resources.',
  },
  {
    path: '/timetable',
    title: 'Timetable',
    description: 'View your class schedule and upcoming sessions.',
  },
  {
    path: '/assignments',
    title: 'Assignments',
    description: 'Review assignment instructions, deadlines, and submissions.',
  },
  {
    path: '/attendance',
    title: 'Attendance',
    description: 'Review your attendance records for assigned courses.',
  },
  {
    path: '/announcements',
    title: 'Announcements',
    description: 'Find academic notices and relevant campus updates.',
  },
  {
    path: '/clubs-events',
    title: 'Clubs & Events',
    description: 'Explore campus clubs, activities, and upcoming events.',
  },
]

function DashboardPage() {
  const cards = [
    {
      title: 'My Courses',
      description: 'Your enrolled academic courses will appear here.',
      path: '/courses',
      symbol: '▤',
    },
    {
      title: 'Assignments',
      description: 'Keep track of coursework and submission deadlines.',
      path: '/assignments',
      symbol: '✓',
    },
    {
      title: 'Attendance',
      description: 'Review attendance records for your courses.',
      path: '/attendance',
      symbol: '◷',
    },
    {
      title: 'Announcements',
      description: 'Stay informed about important academic notices.',
      path: '/announcements',
      symbol: '▱',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            STUDENT PORTAL
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Your campus, connected.
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
            Your starting point for academic information, coursework, and campus
            activities.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <span className="size-2 rounded-full bg-blue-500" />
          Portal preview
        </span>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <NavLink
            key={card.path}
            to={card.path}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {card.symbol}
            </span>

            <h2 className="mt-5 font-semibold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
              {card.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {card.description}
            </p>

            <span className="mt-5 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">
              Open section →
            </span>
          </NavLink>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Getting started
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Your dashboard structure is ready. Live courses, attendance,
          announcements, and assignments will be connected to the backend as
          their features are implemented.
        </p>
      </section>
    </div>
  )
}

function NotFoundPage() {
  return (
    <PlaceholderPage
      title="Page not found"
      description="The page you requested does not exist. Return to the dashboard to continue."
    />
  )
}

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
    }`

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold tracking-tight text-white shadow-sm">
          CC
        </span>

        <div>
          <p className="font-bold tracking-tight text-slate-900 dark:text-white">
            CampusConnect
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Campus portal
          </p>
        </div>
      </div>

      <div className="px-4 pb-2 pt-3">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={navClass}
            onClick={() => setMenuOpen(false)}
          >
            <span
              aria-hidden="true"
              className="flex w-5 justify-center text-lg"
            >
              {item.symbol}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsDark((current) => !current)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span>{isDark ? 'Dark appearance' : 'Light appearance'}</span>
          <span aria-hidden="true">{isDark ? '☾' : '☼'}</span>
        </button>

        <p className="mt-3 px-3 text-xs text-slate-400">CampusConnect · MVP</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:hidden dark:border-slate-700"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>

            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Campus workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
              Welcome to CampusConnect
            </span>

            <div
              aria-label="Guest profile"
              title="Guest profile"
              className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              G
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Routes>
            <Route path="/" element={<DashboardPage />} />

            {placeholderPages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={
                  <PlaceholderPage
                    title={page.title}
                    description={page.description}
                  />
                }
              />
            ))}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 sm:px-6 lg:px-8 dark:border-slate-800 dark:text-slate-400">
          CampusConnect · One place for your campus experience
        </footer>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
