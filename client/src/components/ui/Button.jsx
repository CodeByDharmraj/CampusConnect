
const variants = {
    primary:
        'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400',
    secondary:
        'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-elevated)]',
    ghost:
        'text-[var(--color-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)]',
}

export default function Button({
    children,
    variant = 'primary',
    type = 'button',
    className = '',
    ...props
}) {
    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant] ?? variants.primary} ${className}`}
            {...props}
        >
            {children}
        </button>
    )
}
