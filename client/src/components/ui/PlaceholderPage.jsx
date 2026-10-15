
import AppLayout from '../layout/AppLayout.jsx'
import PageHeader from './PageHeader.jsx'
import Card from './Card.jsx'

export default function PlaceholderPage({
    title,
    description,
    message,
}) {
    return (
        <>
            <PageHeader
                title={title}
                description={description}
            />

            <Card>
                <p className="text-sm leading-6 text-[var(--color-muted)]">
                    {message}
                </p>
            </Card>
        </>
    )
}
