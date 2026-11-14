import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ArrowLeft, FileText, Trash2, Upload } from 'lucide-react'

import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Textarea from '../components/Textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card.jsx'
import { useAuth } from '../context/useAuth.js'
import { apiClient } from '../lib/apiClient.js'
import { authOptions, formatDateTime, getErrorMessage } from '../lib/pageHelpers.js'

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
}
const MAX_BYTES = 10 * 1024 * 1024

function formatSize(bytes) {
  if (!bytes) return '—'

  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

export default function FacultyCourseMaterialsPage() {
  const { courseOfferingId } = useParams()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const options = authOptions(accessToken)
  const fileInput = useRef(null)

  const [form, setForm] = useState({ title: '', description: '', visibility: 'enrolled' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)

  const materialsQuery = useQuery({
    queryKey: ['faculty-materials', courseOfferingId, accessToken],
    queryFn: async () =>
      (await apiClient.get(`/course-materials/offering/${encodeURIComponent(courseOfferingId)}`, options)).data.materials,
    enabled: Boolean(accessToken && courseOfferingId),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const metadata = {
        courseOfferingId,
        title: form.title.trim(),
        description: form.description.trim(),
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        visibility: form.visibility,
      }

      const urlResponse = await apiClient.post('/course-materials/upload-url', metadata, options)
      const { uploadUrl, uploadHeaders, objectKey } = urlResponse.data

      if (!uploadUrl || !objectKey) throw new Error('The server returned an incomplete upload response.')

      const uploadResult = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file })

      if (!uploadResult.ok) throw new Error(`Upload failed (HTTP ${uploadResult.status}).`)

      return apiClient.post('/course-materials/complete', { ...metadata, objectKey }, options)
    },
    onSuccess: async () => {
      setForm({ title: '', description: '', visibility: 'enrolled' })
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setFeedback({ type: 'success', message: 'Material uploaded successfully.' })
      await queryClient.invalidateQueries({ queryKey: ['faculty-materials'] })
    },
    onError: (err) => setFeedback({ type: 'error', message: getErrorMessage(err) }),
  })

  const deleteMutation = useMutation({
    mutationFn: (materialId) => apiClient.delete(`/course-materials/${encodeURIComponent(materialId)}`, options),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Material deleted.' })
      await queryClient.invalidateQueries({ queryKey: ['faculty-materials'] })
    },
    onError: (err) => setFeedback({ type: 'error', message: getErrorMessage(err) }),
  })

  async function download(materialId) {
    try {
      const response = await apiClient.get(`/course-materials/${encodeURIComponent(materialId)}/download-url`, options)

      window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setFeedback({ type: 'error', message: getErrorMessage(err) })
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    setError('')

    if (form.title.trim().length < 2 || form.title.trim().length > 150) return setError('Title must be 2–150 characters.')
    if (!file) return setError('Choose a file to upload.')
    if (!ALLOWED_TYPES[file.type]) return setError('Only PDF, DOCX, PPTX and XLSX files are supported.')
    if (file.size < 1 || file.size > MAX_BYTES) return setError('File size must be between 1 byte and 10 MB.')

    uploadMutation.mutate()
  }

  const materials = materialsQuery.data ?? []

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">
        <ArrowLeft size={16} aria-hidden="true" /> Back to my courses
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Course Materials</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Upload notes, slides and references for this course offering.</p>
      </header>

      <Card padding="lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Upload size={18} aria-hidden="true" /> Upload material</CardTitle>
          <CardDescription>PDF, DOCX, PPTX or XLSX up to 10 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required />
              <Select
                label="Visible to"
                options={[{ value: 'enrolled', label: 'Enrolled students' }, { value: 'faculty', label: 'Faculty only' }]}
                value={form.visibility}
                onChange={(e) => setForm((c) => ({ ...c, visibility: e.target.value }))}
              />
            </div>
            <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            <div>
              <label htmlFor="material-file" className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">File</label>
              <input
                id="material-file"
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.pptx,.xlsx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 dark:text-slate-300"
              />
            </div>
            {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
            {feedback ? (
              <p role={feedback.type === 'error' ? 'alert' : 'status'}
                className={feedback.type === 'error' ? 'text-sm text-red-700 dark:text-red-300' : 'text-sm text-green-700 dark:text-green-300'}>
                {feedback.message}
              </p>
            ) : null}
            <Button type="submit" isLoading={uploadMutation.isPending}>Upload</Button>
          </form>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader><CardTitle className="text-base">Uploaded materials</CardTitle></CardHeader>
        <CardContent>
          {materialsQuery.isLoading ? (
            <p role="status" className="text-sm text-slate-600">Loading materials…</p>
          ) : materialsQuery.isError ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{getErrorMessage(materialsQuery.error)}</p>
          ) : materials.length === 0 ? (
            <EmptyState title="No materials yet" description="Uploaded files appear here." />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {materials.map((material) => (
                <li key={material._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-start gap-3">
                    <FileText size={20} className="mt-0.5 text-slate-500" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{material.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {material.originalName} · {formatSize(material.sizeBytes)} · {formatDateTime(material.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={material.visibility === 'faculty' ? 'warning' : 'success'}>
                      {material.visibility === 'faculty' ? 'Faculty only' : 'Enrolled'}
                    </StatusBadge>
                    <Button size="sm" variant="outline" onClick={() => download(material._id)}>Download</Button>
                    <Button size="sm" variant="danger" aria-label={`Delete ${material.title}`} isLoading={deleteMutation.isPending && deleteMutation.variables === material._id} onClick={() => deleteMutation.mutate(material._id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
