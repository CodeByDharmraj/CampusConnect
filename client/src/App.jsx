import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CalendarCheck,
  Megaphone,
  Users,
  GraduationCap,
  FileCheck,
  Building2,
  UserCog,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  LogIn,
  LogOut,
  ChevronDown,
} from 'lucide-react'

import { queryClient } from './lib/queryClient'
import { useAuth } from './context/useAuth'

import PlaceholderPage from './pages/PlaceholderPage'
import DashboardPrototypePage from './pages/DashboardPrototypePage'
import LoginFormPage from './pages/LoginFormPage'
import AnnouncementFormPage from './pages/AnnouncementFormPage'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import PublicRoute from './routes/PublicRoute.jsx'

import {
  navigationPermissions,
  hasPermission,
} from './config/rolePermissions.js'

// Each item has its own navigation visibility policy.
const navigation = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    permission: 'dashboard',
  },
  {
    label: 'My Courses',
    path: '/courses',
    icon: BookOpen,
    permission: 'courses',
  },
  {
    label: 'Timetable',
    path: '/timetable',
    icon: CalendarDays,
    permission: 'timetable',
  },
  {
    label: 'Assignments',
    path: '/assignments',
    icon: ClipboardCheck,
    permission: 'assignments',
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: CalendarCheck,
    permission: 'attendance',
  },
  {
    label: 'Announcements',
    path: '/announcements',
    icon: Megaphone,
    permission: 'announcements',
  },
  {
    label: 'Clubs & Events',
    path: '/clubs-events',
    icon: Users,
    permission: 'clubsEvents',
  },
  {
    label: 'Grades & Feedback',
    path: '/grades',
    icon: GraduationCap,
    permission: 'grades',
  },
  {
    label: 'Submissions',
    path: '/submissions',
    icon: FileCheck,
    permission: 'submissions',
  },
  {
    label: 'Faculty-Course Management',
    path: '/faculty-course-management',
    icon: Users,
    permission: 'facultyCourseManagement',
  },
  {
    label: 'Department Management',
    path: '/departments',
    icon: Building2,
    permission: 'departmentManagement',
  },
  {
    label: 'Faculty Management',
    path: '/faculty-management',
    icon: UserCog,
    permission: 'facultyManagement',
  },
  {
    label: 'Institutional Settings',
    path: '/institutional-settings',
    icon: Settings,
    permission: 'institutionalSettings',
  },
]

// Placeholder routes for features that will be implemented later.
const placeholderPages = [
  {
    path: '/courses',
    title: 'My Courses',
    description: 'Access your enrolled or assigned courses.',
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
    description: 'View attendance records within your authorized scope.',
  },
  {
    path: '/clubs-events',
    title: 'Clubs & Events',
    description: 'Explore campus clubs, activities, and upcoming events.',
  },
  {
    path: '/grades',
    title: 'Grades & Feedback',
    description: 'View grades and academic feedback.',
  },
  {
    path: '/submissions',
    title: 'Submissions',
    description: 'Review and evaluate authorized student submissions.',
  },
  {
    path: '/faculty-course-management',
    title: 'Faculty-Course Management',
    description:
      'Manage faculty teaching assignments within your authorized scope.',
  },
  {
    path: '/departments',
    title: 'Department Management',
    description: 'Manage institution departments.',
  },
  {
    path: '/faculty-management',
    title: 'Faculty Management',
    description: 'Manage faculty accounts and information.',
  },
  {
    path: '/institutional-settings',
    title: 'Institutional Settings',
    description: 'Manage institution-wide configuration.',
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const visibleNavigation = navigation.filter((item) =>
    hasPermission(user?.role, navigationPermissions[item.permission]),
  )

  const navigate = useNavigate()

  const profileInitials = (user?.name || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setProfileMenuOpen(false)
      setMenuOpen(false)
      navigate('/login', { replace: true })
    }
  }

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

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 pb-4"
      >
        {visibleNavigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={navClass}
              onClick={() => {
                setMenuOpen(false)
                setProfileMenuOpen(false)
              }}
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
            {isLoading ? (
              <span
                aria-label="Loading account"
                className="size-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
              />
            ) : isAuthenticated ? (
              <>
                <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
                  Welcome, {user?.name || 'User'}
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((current) => !current)}
                    aria-label="Open profile menu"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {profileInitials}
                    </span>

                    <ChevronDown
                      size={16}
                      className={`text-slate-500 transition-transform ${
                        profileMenuOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Profile menu"
                      className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {user?.name || 'User'}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {user?.email}
                        </p>

                        <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {user?.role}
                        </span>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <LogOut size={18} aria-hidden="true" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              !isLoading && (
                <NavLink
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <LogIn size={17} aria-hidden="true" />
                  Login
                </NavLink>
              )
            )}
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginFormPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />

              <Route path="/announcements" element={<AnnouncementFormPage />} />

              {placeholderPages.map((page) => {
                const permission = navigation.find(
                  (item) => item.path === page.path,
                )?.permission

                return (
                  <Route
                    key={page.path}
                    element={
                      <ProtectedRoute
                        allowedRoles={navigationPermissions[permission]}
                      />
                    }
                  >
                    <Route
                      path={page.path}
                      element={
                        <PlaceholderPage
                          title={page.title}
                          description={page.description}
                        />
                      }
                    />
                  </Route>
                )
              })}

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={navigationPermissions.clubsEvents}
                  />
                }
              >
                <Route
                  path="/clubs-events"
                  element={
                    <PlaceholderPage
                      title="Clubs & Events"
                      description="Explore campus clubs, activities, and upcoming events."
                    />
                  }
                />
              </Route>
            </Route>

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
