import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  BookOpen,
  UserRound,
  Monitor,
  CalendarCheck,
} from 'lucide-react'

import { useAuth } from '../context/useAuth.js'
import { getTimetable } from '../lib/timetableApi.js'

const DAYS = [
  { label: 'Sunday', short: 'Sun', value: 0 },
  { label: 'Monday', short: 'Mon', value: 1 },
  { label: 'Tuesday', short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday', short: 'Thu', value: 4 },
  { label: 'Friday', short: 'Fri', value: 5 },
  { label: 'Saturday', short: 'Sat', value: 6 },
]

function getMonday(date) {
  const result = new Date(date)
  const day = result.getDay()
  const difference = (day + 6) % 7

  result.setDate(result.getDate() - difference)
  result.setHours(0, 0, 0, 0)

  return result
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-IN', options).format(date)
}

function getDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatTime(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return time || 'Time unavailable'
  }

  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()

  date.setHours(hours, minutes, 0, 0)

  return formatDate(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getCourseDetails(entry) {
  const offering =
    entry?.courseOfferingId && typeof entry.courseOfferingId === 'object'
      ? entry.courseOfferingId
      : {}

  const course =
    offering.courseId && typeof offering.courseId === 'object'
      ? offering.courseId
      : {}

  return {
    name: course.name || 'Untitled course',
    code: course.code || 'Course code unavailable',
    semester: offering.semester,
    section: offering.section,
    academicYear: offering.academicYear,
  }
}

function getFacultyName(entry) {
  const faculty = entry?.facultyId

  if (!faculty || typeof faculty !== 'object') {
    return 'Faculty information unavailable'
  }

  return faculty.name || 'Faculty information unavailable'
}

function getEntryId(entry) {
  return entry?._id || entry?.id
}

function getEntriesForDay(entries, dayOfWeek) {
  return entries
    .filter(
      (entry) => entry.dayOfWeek === dayOfWeek && entry.isActive !== false,
    )
    .sort((a, b) =>
      String(a.startTime || '').localeCompare(String(b.startTime || '')),
    )
}

function getModeLabel(mode) {
  const labels = {
    offline: 'Offline class',
    online: 'Online class',
    hybrid: 'Hybrid class',
  }

  return labels[mode] || 'Class'
}

function TimetableCard({ entry }) {
  const course = getCourseDetails(entry)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Clock3 size={13} aria-hidden="true" />
              {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
            </span>

            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {entry.mode || 'Class'}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {course.name}
          </h3>

          <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
            {course.code}
          </p>
        </div>

        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
          <BookOpen size={19} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:grid-cols-2 dark:border-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <UserRound size={15} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{getFacultyName(entry)}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin size={15} className="shrink-0" aria-hidden="true" />
          <span>{entry.room || 'Room unavailable'}</span>
        </div>

        <div className="flex items-center gap-2">
          <Monitor size={15} className="shrink-0" aria-hidden="true" />
          <span>{getModeLabel(entry.mode)}</span>
        </div>

        {course.section && (
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="shrink-0" aria-hidden="true" />
            <span>Section {course.section}</span>
          </div>
        )}
      </div>
    </article>
  )
}

function EmptyDay({ day }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
      <CalendarCheck
        size={25}
        className="mx-auto text-slate-400"
        aria-hidden="true"
      />

      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        No classes scheduled
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        You have no active timetable entries for {day}.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status">
      <span className="sr-only">Loading timetable</span>

      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-7 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}

function SummaryCard({ label, value, icon, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      {description && (
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  )
}

export default function TimetablePage() {
  const { accessToken, user } = useAuth()

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [view, setView] = useState('week')
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay())

  const {
    data: entries = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['timetable', accessToken],
    queryFn: () => getTimetable(accessToken),
    enabled: Boolean(accessToken),
  })

  const today = new Date()
  const todayDayOfWeek = today.getDay()
  const todayKey = getDateKey(today)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const dayOfWeek = date.getDay()

    return {
      date,
      dayOfWeek,
      day: DAYS.find((item) => item.value === dayOfWeek),
      entries: getEntriesForDay(entries, dayOfWeek),
      isToday: getDateKey(date) === todayKey,
    }
  })

  const todayEntries = getEntriesForDay(entries, todayDayOfWeek)

  const totalClasses = entries.filter(
    (entry) => entry.isActive !== false,
  ).length

  const todayCount = todayEntries.length

  const nextClass = todayEntries.find((entry) => {
    if (!entry.startTime) {
      return false
    }

    const [hours, minutes] = entry.startTime.split(':').map(Number)

    const start = new Date(today)
    start.setHours(hours, minutes, 0, 0)

    return start > today
  })

  const selectedDayData = weekDays.find(
    (item) => item.dayOfWeek === selectedDay,
  )

  const isCurrentWeek = getMonday(new Date()).getTime() === weekStart.getTime()

  const weekEnd = addDays(weekStart, 6)

  function changeWeek(amount) {
    setWeekStart((current) => addDays(current, amount * 7))
  }

  function goToCurrentWeek() {
    setWeekStart(getMonday(new Date()))
    setSelectedDay(new Date().getDay())
  }

  return (
    <section className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Academic workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Timetable
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Welcome, {user?.name || 'User'}. Here is your weekly class schedule.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw
            size={16}
            className={isFetching ? 'animate-spin' : ''}
            aria-hidden="true"
          />
          Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Weekly classes"
          value={totalClasses}
          icon={<BookOpen size={20} />}
        />

        <SummaryCard
          label="Today's classes"
          value={todayCount}
          icon={<CalendarDays size={20} />}
        />

        <SummaryCard
          label="Next class"
          value={nextClass ? formatTime(nextClass.startTime) : '—'}
          icon={<Clock3 size={20} />}
          description={
            nextClass
              ? getCourseDetails(nextClass).name
              : 'No upcoming class today'
          }
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Your schedule
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatDate(weekStart, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' – '}
              {formatDate(weekEnd, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setView('week')}
                aria-pressed={view === 'week'}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  view === 'week'
                    ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Week
              </button>

              <button
                type="button"
                onClick={() => setView('today')}
                aria-pressed={view === 'today'}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  view === 'today'
                    ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={() => changeWeek(-1)}
              aria-label="Previous week"
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => changeWeek(1)}
              aria-label="Next week"
              className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={goToCurrentWeek}
              disabled={isCurrentWeek}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              This week
            </button>
          </div>
        </div>

        {isPending ? (
          <div className="mt-6">
            <LoadingState />
          </div>
        ) : isError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
            <h3 className="font-semibold text-red-800 dark:text-red-300">
              Couldn't load your timetable
            </h3>

            <p className="mt-2 text-sm text-red-700 dark:text-red-400">
              {error?.message || 'Please try again.'}
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : view === 'today' ? (
          <div className="mt-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Today's classes
            </h3>

            {todayEntries.length === 0 ? (
              <EmptyDay day="today" />
            ) : (
              todayEntries.map((entry) => (
                <TimetableCard key={getEntryId(entry)} entry={entry} />
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weekDays.map((item) => (
                <div
                  key={item.dayOfWeek}
                  className={`rounded-xl border p-4 ${
                    item.isToday
                      ? 'border-blue-300 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {item.day.label}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.date, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.isToday
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.isToday
                        ? 'Today'
                        : `${item.entries.length} classes`}
                    </span>
                  </div>

                  {item.entries.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      No classes
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {item.entries.map((entry) => (
                        <button
                          key={getEntryId(entry)}
                          type="button"
                          onClick={() => setSelectedDay(item.dayOfWeek)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800"
                        >
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {formatTime(entry.startTime)} –{' '}
                            {formatTime(entry.endTime)}
                          </p>

                          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                            {getCourseDetails(entry).name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {entry.room || 'Room unavailable'} ·{' '}
                            {entry.mode || 'Class'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <label
                htmlFor="timetable-day"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                View a particular day
              </label>

              <select
                id="timetable-day"
                value={selectedDay}
                onChange={(event) => setSelectedDay(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 sm:max-w-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>

              <div className="mt-4 space-y-3">
                {selectedDayData?.entries.length ? (
                  selectedDayData.entries.map((entry) => (
                    <TimetableCard key={getEntryId(entry)} entry={entry} />
                  ))
                ) : (
                  <EmptyDay
                    day={
                      selectedDayData?.day?.label.toLowerCase() ||
                      'selected day'
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}
