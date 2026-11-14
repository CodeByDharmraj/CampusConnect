import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import Button from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import Avatar from '../components/profile/Avatar.jsx'
import PhotoCropDialog from '../components/profile/PhotoCropDialog.jsx'
import { getVisibleNavigation } from '../config/navigation.js'
import { useAuth } from '../context/useAuth.js'
import useToast from '../context/useToast.js'
import { useProfilePhoto } from '../hooks/useProfilePhoto.js'
import { PHOTO_RULES, validatePhotoFile } from '../lib/profilePhoto.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const { photoUrl, savePhoto, clearPhoto } = useProfilePhoto(user)

  const fileInputRef = useRef(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const accessibleAreas = getVisibleNavigation(user?.role)

  function chooseFile(file) {
    const problem = validatePhotoFile(file)

    setPhotoError(problem ?? '')
    if (!problem) setPendingFile(file)
  }

  function handleInputChange(event) {
    const [file] = event.target.files ?? []
    // Reset so choosing the same file again still fires a change event.
    event.target.value = ''
    if (file) chooseFile(file)
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const [file] = event.dataTransfer?.files ?? []
    if (file) chooseFile(file)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)
  }

  function handleSave(dataUrl) {
    if (!savePhoto(dataUrl)) return false

    setPendingFile(null)
    toast.success('Photo saved.')
    return true
  }

  function handleRemove() {
    clearPhoto()
    setPhotoError('')
    toast.success('Photo removed.')
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Your profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your photo and account details.
        </p>
      </header>

      <Card
        padding="lg"
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={
          isDragging ? 'border-blue-500 ring-2 ring-blue-500 dark:border-blue-500' : ''
        }
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Avatar user={user} photoUrl={photoUrl} size="xl" />

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-50">
                {user?.name || 'User'}
              </h2>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Button
                leftIcon={<Camera size={16} aria-hidden="true" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoUrl ? 'Change photo' : 'Add photo'}
              </Button>

              {photoUrl && (
                <Button
                  variant="outline"
                  leftIcon={<Trash2 size={16} aria-hidden="true" />}
                  onClick={handleRemove}
                >
                  Remove photo
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={PHOTO_RULES.acceptAttribute}
              onChange={handleInputChange}
              className="sr-only"
              aria-label="Choose a profile photo"
              tabIndex={-1}
            />

            {photoError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {photoError}
              </p>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              JPG, PNG or WebP, up to 5 MB. You can also drop an image here. Your
              photo is saved in this browser only, so it will not appear on your
              other devices.
            </p>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Account details
        </h2>

        <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {user?.name || 'Not provided'}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
              {user?.email || 'Not provided'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Role</dt>
            <dd className="mt-1 font-medium capitalize text-slate-900 dark:text-slate-100">
              {user?.role || 'Not provided'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card padding="lg">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          What your role can open
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {accessibleAreas.length} areas are available to a {user?.role} account.
        </p>

        {/* Link colour is set on each <li>: a global `a { color: inherit }`
            rule outranks utility classes placed on the link itself. */}
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleAreas.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.path} className="text-slate-700 dark:text-slate-200">
                <Link
                  to={item.path}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </Card>

      <PhotoCropDialog
        file={pendingFile}
        onClose={() => setPendingFile(null)}
        onSave={handleSave}
      />
    </div>
  )
}
