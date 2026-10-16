
import { useState } from 'react'
import { Link } from 'react-router'
import FormField from '../components/ui/FormField.jsx'
import Button from '../components/ui/Button.jsx'

function validateLogin(values) {
    const errors = {}

    const email = values.email.trim()

    if (!email) {
        errors.email = 'Enter your college email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Enter an email address in a valid format.'
    }

    if (!values.password) {
        errors.password = 'Enter your password.'
    }

    return errors
}

export default function LoginPage() {
    const [values, setValues] = useState({
        email: '',
        password: '',
    })

    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState(null)

    function handleChange(event) {
        const { name, value } = event.target

        setValues((current) => ({
            ...current,
            [name]: value,
        }))

        setErrors((current) => ({
            ...current,
            [name]: '',
        }))

        setFeedback(null)
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setFeedback(null)

        const nextErrors = validateLogin(values)
        setErrors(nextErrors)

        if (Object.keys(nextErrors).length > 0) {
            return
        }

        setLoading(true)

        try {
            // Demo only: no authentication request is sent.
            await new Promise((resolve) => setTimeout(resolve, 700))

            setFeedback({
                type: 'info',
                message:
                    'Your form passed client-side validation. Authentication is not connected yet, so you have not been signed in.',
            })
        } catch {
            setFeedback({
                type: 'error',
                message: 'Something went wrong. Please try again.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4 py-10 text-[var(--color-text)]">
            <section className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
                <div className="mb-8 text-center">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        CU Jammu · Demo branding
                    </p>

                    <h1 className="mt-3 text-3xl font-bold tracking-tight">
                        Welcome back
                    </h1>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                        Sign-in interface for CampusConnect
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <FormField
                        id="email"
                        label="College email"
                        type="email"
                        value={values.email}
                        onChange={handleChange}
                        placeholder="you@college.edu"
                        autoComplete="username"
                        error={errors.email}
                        required
                        disabled={loading}
                    />

                    <FormField
                        id="password"
                        label="Password"
                        type="password"
                        value={values.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        error={errors.password}
                        required
                        disabled={loading}
                    />

                    {feedback && (
                        <p
                            role="status"
                            aria-live="polite"
                            className={`rounded-lg p-3 text-sm ${feedback.type === 'error'
                                    ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                                    : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                }`}
                        >
                            {feedback.message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Checking form…' : 'Continue'}
                    </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
                    Exploring the interface?{' '}
                    <Link
                        to="/dashboard"
                        className="font-semibold text-blue-700 underline underline-offset-4 dark:text-blue-300"
                    >
                        View the demo dashboard
                    </Link>
                </p>

                <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
                    Demo interface only. No credentials are sent or verified.
                </p>
            </section>
        </main>
    )
}
