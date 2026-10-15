
import Card from './Card.jsx'
import StatusBadge from './StatusBadge.jsx'

export default function AnnouncementCard({
    title,
    summary,
    category,
    publishedAt,
    read = false,
}) {
    return (
        <Card className={read ? '' : 'border-l-4 border-l-blue-600'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    {category}
                </span>

                <StatusBadge status={read ? 'Read' : 'Unread'} />
            </div>

            <h3 className="mt-4 text-lg font-semibold">{title}</h3>

            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {summary}
            </p>

            <p className="mt-4 text-xs text-[var(--color-muted)]">
                Published {publishedAt}
            </p>
        </Card>
    )
}
