import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const toastVariants = {
  success: {
    icon: CheckCircle2,
    container:
      'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    container:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    container:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    container:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
}

export default function Toast({ message, type = 'info', onDismiss }) {
  const variant = toastVariants[type] || toastVariants.info
  const Icon = variant.icon

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg ${variant.container}`}
    >
      <Icon
        size={20}
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${variant.iconColor}`}
      />

      <p className="min-w-0 flex-1 text-sm font-medium leading-5">{message}</p>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/10"
      >
        <X size={17} aria-hidden="true" />
      </button>
    </div>
  )
}
