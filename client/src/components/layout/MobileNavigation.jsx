import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// The mobile navigation drawer: backdrop, dialog shell and close button.
// The navigation content itself is passed in as children.
//
// The component stays mounted while closed (it just renders nothing) because
// its effects must observe the open -> closed transition to restore focus.
//
// `onClose` must be referentially stable (wrap it in useCallback). The
// keyboard effect re-runs when it changes, and each run moves focus to the
// close button.
export default function MobileNavigation({
  isOpen,
  onClose,
  triggerRef,
  children,
}) {
  const closeButtonRef = useRef(null)
  const wasOpenRef = useRef(false)

  // While open: focus the close button, close on Escape, trap Tab inside.
  useEffect(() => {
    if (!isOpen) return undefined

    closeButtonRef.current?.focus()

    function handleDrawerKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const drawer = document.getElementById('mobile-navigation')
      const focusable = drawer?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDrawerKeyDown)
    return () => document.removeEventListener('keydown', handleDrawerKeyDown)
  }, [isOpen, onClose])

  // When the drawer closes, hand focus back to the button that opened it.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      return
    }

    if (wasOpenRef.current) {
      triggerRef.current?.focus()
      wasOpenRef.current = false
    }
  }, [isOpen, triggerRef])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
      />

      <aside
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="absolute right-3 top-6 z-10 inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>

        {children}
      </aside>
    </div>
  )
}
