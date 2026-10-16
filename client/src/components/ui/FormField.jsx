
export default function FormField({
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    autoComplete,
    error,
    helpText,
    required = false,
    disabled = false,
}) {
    const helpId = `${id}-help`
    const errorId = `${id}-error`

    const describedBy = [
        helpText ? helpId : null,
        error ? errorId : null,
    ]
        .filter(Boolean)
        .join(' ') || undefined

    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="block text-sm font-medium"
            >
                {label}
                {required && (
                    <span aria-hidden="true" className="ml-1 text-red-600">
                        *
                    </span>
                )}
            </label>

            <input
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoComplete={autoComplete}
                required={required}
                disabled={disabled}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                className={`w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${error
                        ? 'border-red-500'
                        : 'border-[var(--color-border)]'
                    }`}
            />

            {helpText && !error && (
                <p id={helpId} className="text-xs text-[var(--color-muted)]">
                    {helpText}
                </p>
            )}

            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-300"
                >
                    {error}
                </p>
            )}
        </div>
    )
}
