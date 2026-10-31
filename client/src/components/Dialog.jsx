import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
  ...props
}) {
  const dialogRef = useRef(null)
  const openRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) return

    // Keep the ref synchronized outside render.
    openRef.current = open

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleCancel = (event) => {
    // React remains responsible for changing the open state.
    event.preventDefault()
    onClose?.()
  }

  const handleNativeClose = () => {
    // Ignore close events caused by React changing open to false.
    if (openRef.current) {
      onClose?.()
    }
  }

  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === dialogRef.current) {
      onClose?.()
    }
  }

  const classes = [
    'mx-auto my-auto max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl',
    'backdrop:bg-slate-950/50',
    'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
    sizeStyles[size] ?? sizeStyles.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={classes}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onClick={handleBackdropClick}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>

          {description && (
            <p
              id={descriptionId}
              className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {description}
            </p>
          )}
        </div>

        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="p-5 text-sm text-slate-700 dark:text-slate-300">
        {children}
      </div>

      {footer && (
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end dark:border-slate-800">
          {footer}
        </div>
      )}
    </dialog>
  )
}
