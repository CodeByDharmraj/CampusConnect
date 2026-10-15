
export default function PageHeader({ title, description, action }) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {title}
                </h1>

                {description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                        {description}
                    </p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}
