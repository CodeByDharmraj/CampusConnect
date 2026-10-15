
import { Link } from 'react-router'
import AppLayout from '../components/layout/AppLayout.jsx'
import Button from '../components/ui/Button.jsx'

export default function NotFoundPage() {
    return (
        <>
            <div className="mx-auto max-w-xl py-16 text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Error 404
                </p>

                <h1 className="mt-3 text-3xl font-bold">
                    Page not found
                </h1>

                <p className="mt-3 text-[var(--color-muted)]">
                    The page you requested does not exist.
                </p>

                <div className="mt-6">
                    <Link
                        to="/dashboard"
                        className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </>
    )
}
