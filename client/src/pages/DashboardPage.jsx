
// import AppLayout from '../components/layout/AppLayout.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import AnnouncementCard from '../components/ui/AnnouncementCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

import { Link } from 'react-router'

const demoAnnouncements = [
    {
        id: 1,
        title: 'Workshop registration reminder',
        summary:
            'Review the workshop details and registration deadline before applying.',
        category: 'Workshop',
        publishedAt: 'Today',
        read: false,
    },
    {
        id: 2,
        title: 'Updated academic timetable',
        summary:
            'Check the latest timetable information before attending your next class.',
        category: 'Academic',
        publishedAt: 'Yesterday',
        read: true,
    },
]

export default function DashboardPage() {
    return (
        <>
            <PageHeader
                title="Dashboard"
                description="Your academic information and campus updates, together."
                action={
                    <Link
                        to="/announcements"
                        className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400"
                    >
                        View announcements
                    </Link>
                  }
            />

            <section
                aria-label="Academic overview"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                <StatCard
                    label="My courses"
                    value="04"
                    detail="Illustrative demo value"
                />
                <StatCard
                    label="Unread announcements"
                    value="02"
                    detail="Illustrative demo value"
                />
                <StatCard
                    label="Pending assignments"
                    value="03"
                    detail="Illustrative demo value"
                />
            </section>

            <section className="mt-10">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">Recent announcements</h2>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                            Important updates from your campus.
                        </p>
                    </div>
                </div>

                {demoAnnouncements.length > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {demoAnnouncements.map((announcement) => (
                            <AnnouncementCard
                                key={announcement.id}
                                {...announcement}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="No announcements yet"
                        description="New campus updates will appear here."
                    />
                )}
            </section>
        </>
    )
}
