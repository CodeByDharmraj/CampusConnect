import { useEffect, useRef } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import { useProfilePhoto } from '../../hooks/useProfilePhoto.js'
import Avatar from '../profile/Avatar.jsx'

// Account dropdown in the header.
//
// Keyboard: opening moves focus into the menu; Arrow Up/Down, Home and End move
// between items; Escape closes and returns focus to the button; Tab closes.
// Clicking anywhere outside also closes it.
//
// `onClose` must be referentially stable (wrap it in useCallback): the effect
// below depends on it and moves focus each time it runs.
export default function ProfileMenu({
  user,
  isOpen,
  onToggle,
  onClose,
  onLogout,
}) {
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const { photoUrl } = useProfilePhoto(user)

  useEffect(() => {
    if (!isOpen) return undefined

    menuRef.current?.querySelector('[role="menuitem"]')?.focus()

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) onClose()
    }

    function handleEscape(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  function handleMenuKeyDown(event) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const index = items.indexOf(document.activeElement)
    let next

    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
    else if (event.key === 'ArrowUp') {
      next = items[(index - 1 + items.length) % items.length]
    } else if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items[items.length - 1]
    else if (event.key === 'Tab') {
      // Hand focus back to the button so Tab continues from there.
      triggerRef.current?.focus()
      onClose()
      return
    } else return

    event.preventDefault()
    next?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800"
      >
        <Avatar user={user} photoUrl={photoUrl} size="md" />

        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Profile menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <Avatar user={user} photoUrl={photoUrl} size="lg" />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.name || 'User'}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Text colour lives on this wrapper: a global `a { color: inherit }`
              rule outranks utility classes placed on the link itself. */}
          <div className="p-2 text-slate-700 dark:text-slate-200">
            <Link
              to="/profile"
              role="menuitem"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800"
            >
              <UserRound size={18} aria-hidden="true" />
              My profile
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut size={18} aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
