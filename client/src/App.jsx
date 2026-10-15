
function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold text-blue-700">
            CampusConnect
          </a>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Student Portal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Centralized campus information
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to CampusConnect
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Find academic announcements, course information, attendance,
          and assignment deadlines in one place.
        </p>

        <section
          aria-label="Portal features"
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Announcements</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep important notices and campus updates together.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">My Attendance</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Check attendance records and request corrections.
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Assignments</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Find assignment instructions and due dates.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
