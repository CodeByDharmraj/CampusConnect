import { useState } from 'react'
import { Link } from 'react-router'

const initialValues = {
  email: '',
  password: '',
}

export default function LoginFormPage() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target

    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFeedback(null)
  }

  function validate() {
    const nextErrors = {}
    const email = values.email.trim()

    if (!email) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!values.password) {
      nextErrors.password = 'Enter your password.'
    } else if (values.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters for this demo.'
    }

    return nextErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const nextErrors = validate()
    setErrors(nextErrors)
    setFeedback(null)

    if (Object.values(nextErrors).some(Boolean)) return

    setIsSubmitting(true)

    try {
      // Demonstration only: this does not contact an API or authenticate anyone.
      await new Promise((resolve) => setTimeout(resolve, 400))

      setFeedback({
        type: 'success',
        message:
          'Form validation passed. This demo has not signed you in or created a session.',
      })
    } catch {
      setFeedback({
        type: 'error',
        message: 'The demo submission failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass =
    'mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white'

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
          CampusConnect · Phase 10
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Explore controlled inputs and form validation in a local prototype.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            College email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            placeholder="you@example.edu"
            disabled={isSubmitting}
            className={fieldClass}
          />
          {errors.email && (
            <p
              id="login-email-error"
              className="mt-2 text-sm text-red-700 dark:text-red-400"
            >
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
            placeholder="At least 8 characters"
            disabled={isSubmitting}
            className={fieldClass}
          />
          {errors.password && (
            <p
              id="login-password-error"
              className="mt-2 text-sm text-red-700 dark:text-red-400"
            >
              {errors.password}
            </p>
          )}
        </div>

        {feedback && (
          <p
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={
              feedback.type === 'error'
                ? 'rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                : 'rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            }
          >
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
        >
          {isSubmitting ? 'Checking form…' : 'Continue'}
        </button>

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Demo only. Do not enter a real password. This form does not
          communicate with the backend.
        </p>

        <div className="border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
          <Link
            to="/"
            className="font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-blue-500 dark:text-blue-400"
          >
            Return to dashboard
          </Link>
        </div>
      </form>
    </div>
  )
}
