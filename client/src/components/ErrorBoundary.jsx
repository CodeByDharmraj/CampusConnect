import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)

    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('CampusConnect rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-blue-600">CampusConnect</p>

            <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              An unexpected interface error occurred. You can try rendering the
              application again.
            </p>

            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Try again
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
