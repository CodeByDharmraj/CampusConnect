import { NavLink } from 'react-router'

import { getVisibleNavigation } from '../../config/navigation.js'
import ThemeToggle from './ThemeToggle.jsx'

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
  }`

// The navigation *content* (branding, role-filtered links, theme toggle).
// It is rendered twice by AppLayout: inside the fixed desktop rail and inside
// the mobile drawer. Each of those supplies its own container.
export default function Sidebar({
  userRole,
  isDark,
  onToggleTheme,
  onNavigate,
}) {
  const visibleNavigation = getVisibleNavigation(userRole)

  return (
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
              onClick={onNavigate}
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
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />

        <p className="mt-3 px-3 text-xs text-slate-400">CampusConnect · MVP</p>
      </div>
    </div>
  )
}
