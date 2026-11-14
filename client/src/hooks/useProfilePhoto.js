import { useCallback, useSyncExternalStore } from 'react'

import {
  getProfilePhotoKey,
  readProfilePhoto,
  removeProfilePhoto,
  subscribeToProfilePhoto,
  writeProfilePhoto,
} from '../lib/profilePhoto.js'

// The current user's profile photo. Every component that calls this (header
// avatar, profile menu, profile page) re-renders together when it changes.
export function useProfilePhoto(user) {
  const key = getProfilePhotoKey(user)

  const getSnapshot = useCallback(() => readProfilePhoto(key), [key])
  const photoUrl = useSyncExternalStore(
    subscribeToProfilePhoto,
    getSnapshot,
    () => null,
  )

  const savePhoto = useCallback((dataUrl) => writeProfilePhoto(key, dataUrl), [key])
  const clearPhoto = useCallback(() => removeProfilePhoto(key), [key])

  return { photoUrl, savePhoto, clearPhoto }
}
