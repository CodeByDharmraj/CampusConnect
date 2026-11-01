import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, GraduationCap, RefreshCw } from 'lucide-react'

import { apiClient } from '../lib/apiClient'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/Card'
import { useAuth } from '../context/useAuth.js'

async function fetchMyCourses(accessToken) {
  const response = await apiClient.get('/courses/my', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return response.data.courses
}

function CourseCard({ course }) {
  const offering = course.courseOffering
  const details = offering.courseId

  return (
    <Card variant="interactive" padding="lg" className="flex h-full flex-col">
      <CardHeader>
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <BookOpen size={21} aria-hidden="true" />
          </span>

          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {course.relationshipStatus === 'assigned'
              ? 'Faculty assignment'
              : 'Enrolled'}
          </span>
        </div>

        <CardTitle className="text-lg">{details.name}</CardTitle>

        <CardDescription className="mt-1 font-medium">
          {details.code}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-4 flex-1">
        {details.description && (
          <p className="line-clamp-3 leading-6">{details.description}</p>
        )}

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays
              size={16}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <span>Academic year: {offering.academicYear}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <GraduationCap
              size={16}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
            <span>
              Semester {offering.semester} · Section {offering.section}
            </span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {details.credits} {details.credits === 1 ? 'credit' : 'credits'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function CourseSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      aria-hidden="true"
    >
      <div className="size-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="mt-5 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-8 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export default function MyCoursesPage() {
  const { accessToken } = useAuth()

  const {
    data: courses = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['my-courses', accessToken],
    queryFn: () => fetchMyCourses(accessToken),
    enabled: Boolean(accessToken),
  })

  return (
    <section className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Academic workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            My Courses
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            View your current enrolled or assigned course offerings.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          isLoading={isFetching}
          leftIcon={!isFetching && <RefreshCw size={16} />}
        >
          Refresh
        </Button>
      </div>

      {isPending ? (
        <div
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Loading your courses"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <CourseSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your courses"
          description={
            error?.message ||
            'Something went wrong while retrieving your courses. Please try again.'
          }
          icon={<BookOpen size={28} />}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses available"
          description="You don't currently have any active course enrollments or teaching assignments."
          icon={<BookOpen size={28} />}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your current courses
            </p>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
