import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router'
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CalendarCheck,
  Megaphone,
  Users,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react'

import { queryClient } from './lib/queryClient'
import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPrototypePage from './pages/DashboardPrototypePage'

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'My Courses', path: '/courses', icon: BookOpen },
  { label: 'Timetable', path: '/timetable', icon: CalendarDays },
  { label: 'Assignments', path: '/assignments', icon: ClipboardCheck },
  { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
  { label: 'Announcements', path: '/announcements', icon: Megaphone },
  { label: 'Clubs & Events', path: '/clubs-events', icon: Users },
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
  return <DashboardPrototypePage />
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
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={navClass}
              onClick={() => setMenuOpen(false)}
            >
              <span
                aria-hidden="true"
                className="flex w-5 shrink-0 justify-center"
              >
                <Icon size={18} strokeWidth={1.8} />
              </span>

              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsDark((current) => !current)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span>{isDark ? 'Dark appearance' : 'Light appearance'}</span>
          <span aria-hidden="true">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
          </span>
        </button>

        <p className="mt-3 px-3 text-xs text-slate-400">CampusConnect · MVP</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {/* Mobile navigation drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMenuOpen(false)}
          />

          <aside
            id="mobile-navigation"
            aria-label="Mobile navigation drawer"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-6 z-10 inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} strokeWidth={2} aria-hidden="true" />
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

        {/* Application routes */}
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
