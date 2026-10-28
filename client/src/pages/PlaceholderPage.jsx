import { Link } from 'react-router'

function PlaceholderPage({ title, description }) {
  return (
    <section className="mx-auto max-w-4xl">
      <Link
        to="/"
        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          CampusConnect
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
          {description}
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Page foundation ready
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            This section will be implemented in its dedicated development phase.
            No sample academic records are being presented as real data.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PlaceholderPage
