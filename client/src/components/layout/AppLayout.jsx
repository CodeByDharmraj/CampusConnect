import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '../../context/useAuth.js'
import { useTheme } from '../../hooks/useTheme.js'
import Header from './Header.jsx'
import MobileNavigation from './MobileNavigation.jsx'
import Sidebar from './Sidebar.jsx'

// The application shell. It owns the state that several shell pieces share
// (mobile drawer, profile menu, theme, auth) and hands each piece only what it
// needs. The page content is passed in as children, so the shell knows nothing
// about routing.
export default function AppLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const menuTriggerRef = useRef(null)

  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Stable identity: MobileNavigation's keyboard effect depends on it.
  const closeMobileMenu = useCallback(() => setMenuOpen(false), [])
  const closeProfileMenu = useCallback(() => setProfileMenuOpen(false), [])

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

  const sidebar = (
    <Sidebar
      userRole={user?.role}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      onNavigate={() => {
        setMenuOpen(false)
        setProfileMenuOpen(false)
      }}
    />
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      <MobileNavigation
        isOpen={menuOpen}
        onClose={closeMobileMenu}
        triggerRef={menuTriggerRef}
      >
        {sidebar}
      </MobileNavigation>

      <div className="min-h-screen lg:pl-64">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          isMobileMenuOpen={menuOpen}
          onOpenMobileMenu={() => setMenuOpen(true)}
          menuTriggerRef={menuTriggerRef}
          isProfileMenuOpen={profileMenuOpen}
          onToggleProfileMenu={() => setProfileMenuOpen((current) => !current)}
          onCloseProfileMenu={closeProfileMenu}
          onLogout={handleLogout}
        />

        <main
          id="main-content"
          tabIndex="-1"
          className="min-w-0 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
        >
          {children}
        </main>

        <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 sm:px-6 lg:px-8 dark:border-slate-800 dark:text-slate-400">
          CampusConnect · One place for your campus experience
        </footer>
      </div>
    </div>
  )
}
