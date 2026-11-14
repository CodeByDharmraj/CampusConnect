import { LogIn, Menu } from 'lucide-react'
import { NavLink } from 'react-router'

import cujLogo from '../../assets/cuj-logo.jpg'
import ProfileMenu from './ProfileMenu.jsx'

export default function Header({
  user,
  isAuthenticated,
  isLoading,
  isMobileMenuOpen,
  onOpenMobileMenu,
  menuTriggerRef,
  isProfileMenuOpen,
  onToggleProfileMenu,
  onCloseProfileMenu,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-3">
        <button
          ref={menuTriggerRef}
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls={isMobileMenuOpen ? 'mobile-navigation' : undefined}
          onClick={onOpenMobileMenu}
        >
          <Menu size={22} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <img
            src={cujLogo}
            alt=""
            width="40"
            height="40"
            className="size-10 shrink-0 rounded-full bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-600"
          />

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-white">
              Central University of Jammu
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Campus workspace
            </p>
          </div>

          <span className="sr-only sm:hidden">
            Central University of Jammu, campus workspace
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <span
            aria-label="Loading account"
            className="size-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
          />
        ) : isAuthenticated ? (
          <>
            <div className="hidden text-right md:block">
              <p className="max-w-48 truncate text-sm font-medium text-slate-900 dark:text-white">
                {user?.name || 'User'}
              </p>
              <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                {user?.role}
              </p>
            </div>

            <ProfileMenu
              user={user}
              isOpen={isProfileMenuOpen}
              onToggle={onToggleProfileMenu}
              onClose={onCloseProfileMenu}
              onLogout={onLogout}
            />
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
  )
}
