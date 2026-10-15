
export default function EmptyState({
    title = 'Nothing to show yet',
    description = 'Check back later for updates.',
}) {
    return (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
                {description}
            </p>
        </div>
    )
}
