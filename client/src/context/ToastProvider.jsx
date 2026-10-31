import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Toast from '../components/Toast.jsx'
import ToastContext from './ToastContext.js'

const MAX_TOASTS = 5
const DEFAULT_DURATION = 5000

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef([])
  const timersRef = useRef(new Map())
  const nextIdRef = useRef(0)

  const updateToasts = useCallback((nextToasts) => {
    toastsRef.current = nextToasts
    setToasts(nextToasts)
  }, [])

  const clearToastTimer = useCallback((id) => {
    const timer = timersRef.current.get(id)

    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const dismiss = useCallback(
    (id) => {
      clearToastTimer(id)

      updateToasts(toastsRef.current.filter((toast) => toast.id !== id))
    },
    [clearToastTimer, updateToasts],
  )

  const addToast = useCallback(
    (message, type = 'info', options = {}) => {
      if (typeof message !== 'string' || !message.trim()) {
        return null
      }

      const requestedDuration = options.duration ?? DEFAULT_DURATION

      const duration =
        typeof requestedDuration === 'number' &&
        Number.isFinite(requestedDuration)
          ? Math.max(0, requestedDuration)
          : DEFAULT_DURATION

      const id = `toast-${++nextIdRef.current}`

      const notification = {
        id,
        message: message.trim(),
        type,
      }

      const nextToasts = [...toastsRef.current, notification]

      if (nextToasts.length > MAX_TOASTS) {
        const removedToasts = nextToasts.slice(
          0,
          nextToasts.length - MAX_TOASTS,
        )

        removedToasts.forEach((toast) => {
          clearToastTimer(toast.id)
        })
      }

      updateToasts(nextToasts.slice(-MAX_TOASTS))

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id)
        }, duration)

        timersRef.current.set(id, timer)
      }

      return id
    },
    [clearToastTimer, dismiss, updateToasts],
  )

  const success = useCallback(
    (message, options) => addToast(message, 'success', options),
    [addToast],
  )

  const error = useCallback(
    (message, options) => addToast(message, 'error', options),
    [addToast],
  )

  const warning = useCallback(
    (message, options) => addToast(message, 'warning', options),
    [addToast],
  )

  const info = useCallback(
    (message, options) => addToast(message, 'info', options),
    [addToast],
  )

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      dismiss,
    }),
    [success, error, warning, info, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-label="Notifications"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        role="region"
      >
        {toasts.map((toast) => (
          <div className="pointer-events-auto" key={toast.id}>
            <Toast
              message={toast.message}
              type={toast.type}
              onDismiss={() => dismiss(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
