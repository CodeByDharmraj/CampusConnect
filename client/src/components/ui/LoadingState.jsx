
export default function LoadingState({ label = 'Loading content' }) {
    return (
        <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-5"
        >
            <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
            />
            <span className="text-sm text-[var(--color-muted)]">{label}…</span>
        </div>
    )
}
