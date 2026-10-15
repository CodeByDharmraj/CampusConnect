
import Card from './Card.jsx'

export default function StatCard({ label, value, detail }) {
    return (
        <Card>
            <p className="text-sm font-medium text-[var(--color-muted)]">
                {label}
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight">
                {value}
            </p>

            {detail && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {detail}
                </p>
            )}
        </Card>
    )
}
