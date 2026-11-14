import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileType,
  RefreshCw,
} from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/Card.jsx'
import { apiClient } from '../lib/apiClient.js'
import { useAuth } from '../context/useAuth.js'

function formatFileSize(bytes) {
  const size = Number(bytes)

  if (!Number.isFinite(size) || size <= 0) return 'Unknown size'
  if (size < 1024) return `${size} bytes`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getFileIcon(mimeType) {
  if (mimeType?.includes('spreadsheet')) {
    return <FileSpreadsheet size={23} aria-hidden="true" />
  }

  if (mimeType?.includes('presentation')) {
    return <FileType size={23} aria-hidden="true" />
  }

  if (mimeType?.includes('zip')) {
    return <FileArchive size={23} aria-hidden="true" />
  }

  return <FileText size={23} aria-hidden="true" />
}

function getErrorMessage(error) {
  return (
    error?.message ||
    'We could not load course notes. Please try again.'
  )
}

async function fetchCourseMaterials(courseOfferingId) {
  const response = await apiClient.get(
    `/course-materials/offering/${encodeURIComponent(courseOfferingId)}`,
  )

  return response?.data?.materials ?? []
}

async function fetchMyCourses() {
  const response = await apiClient.get('/courses/my')
  return response?.data?.courses ?? []
}

function MaterialSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      aria-hidden="true"
    >
      <div className="flex gap-4">
        <div className="size-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="mt-5 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

function MaterialCard({ material, onDownload, downloading }) {
  const isDownloading = downloading === material._id

  return (
    <Card className="flex h-full flex-col" padding="lg">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            {getFileIcon(material.mimeType)}
          </span>

          <div className="min-w-0 flex-1">
            <CardTitle className="break-words text-base">
              {material.title}
            </CardTitle>
            <CardDescription className="mt-1 break-all">
              {material.originalName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-4 flex flex-1 flex-col">
        {material.description ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {material.description}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">
            No description provided.
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">File type</dt>
            <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {material.mimeType?.split('/').pop()?.replace(/^vnd\./, '') || 'Document'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">File size</dt>
            <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {formatFileSize(material.sizeBytes)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Uploaded</dt>
            <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">
              {formatDate(material.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Faculty</dt>
            <dd className="mt-1 truncate font-medium text-slate-800 dark:text-slate-200">
              {material.uploadedBy?.name || 'Course faculty'}
            </dd>
          </div>
        </dl>

        <Button
          type="button"
          fullWidth
          className="mt-5"
          isLoading={isDownloading}
          leftIcon={!isDownloading && <Download size={16} />}
          disabled={Boolean(downloading) && !isDownloading}
          onClick={() => onDownload(material)}
        >
          {isDownloading ? 'Preparing download...' : 'Download notes'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function StudentCourseMaterialsPage() {
  const { courseOfferingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [downloading, setDownloading] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const courseFromNavigation = location.state?.course

  const { data: myCourses = [] } = useQuery({
    queryKey: ['my-courses', accessToken],
    queryFn: fetchMyCourses,
    enabled: Boolean(accessToken) && !courseFromNavigation,
    staleTime: 30_000,
  })

  const course = useMemo(() => {
    if (courseFromNavigation) return courseFromNavigation

    return myCourses.find(
      (item) =>
        String(item.courseOffering?._id) === String(courseOfferingId),
    )
  }, [courseFromNavigation, myCourses, courseOfferingId])

  const {
    data: materials = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['course-materials', courseOfferingId],
    queryFn: () => fetchCourseMaterials(courseOfferingId),
    enabled: Boolean(courseOfferingId),
  })

  async function handleDownload(material) {
    if (!material?._id) return

    setDownloading(material._id)
    setDownloadError('')

    try {
      const response = await apiClient.get(
        `/course-materials/${encodeURIComponent(material._id)}/download-url`,
      )
      const downloadUrl = response?.data?.downloadUrl

      if (!downloadUrl) {
        throw new Error('The server did not return a download link.')
      }

      // The signed URL is short-lived and is issued only after the backend
      // confirms the student's active enrollment in this course offering.
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.target = '_blank'
      downloadLink.rel = 'noopener noreferrer'
      downloadLink.click()
    } catch (downloadRequestError) {
      setDownloadError(getErrorMessage(downloadRequestError))
    } finally {
      setDownloading('')
    }
  }

  const offering = course?.courseOffering
  const courseDetails = offering?.courseId
  const courseTitle = courseDetails?.name || 'Course notes'
  const courseCode = courseDetails?.code

  return (
    <section className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            to="/courses"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to My Courses
          </Link>

          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Learning resources
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {courseTitle} — Course Notes
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Access lecture notes, presentations and other resources shared by your faculty.
          </p>
          {courseCode && (
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {courseCode} · Semester {offering?.semester} · Section {offering?.section}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          isLoading={isFetching}
          leftIcon={!isFetching && <RefreshCw size={16} />}
        >
          Refresh notes
        </Button>
      </div>

      {downloadError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {downloadError}
        </div>
      )}

      {isPending ? (
        <div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Loading course notes"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <MaterialSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load course notes"
          description={getErrorMessage(error)}
          icon={<BookOpen size={28} />}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : materials.length === 0 ? (
        <EmptyState
          title="No course notes yet"
          description="Your faculty has not uploaded any student-visible materials for this course. Check again later."
          icon={<BookOpen size={28} />}
          secondaryAction={
            <Button variant="outline" onClick={() => navigate('/courses')}>
              Back to My Courses
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Available learning materials
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Files are stored privately and downloaded through a secure, temporary link.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {materials.length} {materials.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
              <MaterialCard
                key={material._id}
                material={material}
                onDownload={handleDownload}
                downloading={downloading}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
