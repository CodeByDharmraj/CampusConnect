import { useId } from 'react'

const baseStyles = [
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm',
  'text-slate-900 placeholder:text-slate-400',
  'transition-colors duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
  'dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
  'dark:disabled:bg-slate-900',
].join(' ')

export default function Textarea({
  label,
  hint,
  error,
  id,
  rows = 4,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const hintId = `${textareaId}-hint`
  const errorId = `${textareaId}-error`

  const describedBy =
    [hint ? hintId : null, error ? errorId : null, props['aria-describedby']]
      .filter(Boolean)
      .join(' ') || undefined

  const classes = [
    baseStyles,
    error
      ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-400'
      : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <textarea
        {...props}
        id={textareaId}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={classes}
      />

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
