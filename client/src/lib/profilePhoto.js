// Profile photo storage, validation and cropping.
//
// Photos are stored in this browser's localStorage, one per user. Nothing is
// sent to the server. To move to server storage later, replace the three
// read/write/remove functions and keep everything else.

const STORAGE_PREFIX = 'campusconnect:profile-photo:'
const CHANGE_EVENT = 'campusconnect:profile-photo-change'

export const PHOTO_RULES = Object.freeze({
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptAttribute: 'image/jpeg,image/png,image/webp',
  maxFileBytes: 5 * 1024 * 1024,
  minDimension: 128,
  outputSize: 320,
  outputQuality: 0.88,
  maxZoom: 4,
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// ---------- storage ----------

export function getProfilePhotoKey(user) {
  const identifier = user?.id ?? user?._id ?? user?.email
  return identifier ? `${STORAGE_PREFIX}${identifier}` : null
}

export function readProfilePhoto(key) {
  if (!key) return null

  try {
    const value = window.localStorage.getItem(key)
    // Only ever hand an image data URL to <img src>.
    return typeof value === 'string' && value.startsWith('data:image/')
      ? value
      : null
  } catch {
    return null
  }
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// Returns false when the browser refuses to store it (quota, private mode).
export function writeProfilePhoto(key, dataUrl) {
  if (!key) return false

  try {
    window.localStorage.setItem(key, dataUrl)
  } catch {
    return false
  }

  notifyChange()
  return true
}

export function removeProfilePhoto(key) {
  if (!key) return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to remove if storage is unavailable.
  }

  notifyChange()
}

// Same-tab changes use our event; other tabs use the native "storage" event.
export function subscribeToProfilePhoto(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

// ---------- validation ----------

export function validatePhotoFile(file) {
  if (!file) return 'Choose an image to use as your photo.'

  if (!PHOTO_RULES.acceptedTypes.includes(file.type)) {
    return 'That file type is not supported. Choose a JPG, PNG or WebP image.'
  }

  if (file.size > PHOTO_RULES.maxFileBytes) {
    return 'That image is larger than 5 MB. Choose a smaller file.'
  }

  return null
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () =>
      resolve({
        image,
        src,
        width: image.naturalWidth,
        height: image.naturalHeight,
        revoke: () => URL.revokeObjectURL(src),
      })

    image.onerror = () => {
      URL.revokeObjectURL(src)
      reject(new Error('The image could not be read.'))
    }

    image.src = src
  })
}

// ---------- cropping (pure maths) ----------

// The crop is always a square. At zoom 1 it is as large as the image's shorter
// side; higher zoom shrinks it. pan runs from -1 to 1 on each axis and means
// "from one edge of the movable range to the other".
export function computeCropRect({
  imageWidth,
  imageHeight,
  zoom = 1,
  panX = 0,
  panY = 0,
}) {
  const side = Math.min(imageWidth, imageHeight) / clamp(zoom, 1, PHOTO_RULES.maxZoom)
  const rangeX = (imageWidth - side) / 2
  const rangeY = (imageHeight - side) / 2
  const centerX = imageWidth / 2 + clamp(panX, -1, 1) * rangeX
  const centerY = imageHeight / 2 + clamp(panY, -1, 1) * rangeY

  return { sx: centerX - side / 2, sy: centerY - side / 2, side }
}

// Dragging the picture right by dx screen pixels reveals content further left,
// so the pan moves the opposite way.
export function panFromDrag({
  pan,
  dx,
  dy,
  imageWidth,
  imageHeight,
  zoom,
  frameSize,
}) {
  const side = Math.min(imageWidth, imageHeight) / clamp(zoom, 1, PHOTO_RULES.maxZoom)
  const rangeX = (imageWidth - side) / 2
  const rangeY = (imageHeight - side) / 2
  const sourcePerPixel = side / frameSize

  return {
    x: rangeX > 0 ? clamp(pan.x - (dx * sourcePerPixel) / rangeX, -1, 1) : 0,
    y: rangeY > 0 ? clamp(pan.y - (dy * sourcePerPixel) / rangeY, -1, 1) : 0,
  }
}

// Where to place the full image inside a square frame so that `crop` fills it.
export function getPreviewImageStyle({ imageWidth, imageHeight, crop, frameSize }) {
  const scale = frameSize / crop.side

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    left: -crop.sx * scale,
    top: -crop.sy * scale,
  }
}

// Draws the chosen square into a small JPEG and returns it as a data URL.
export function renderCroppedPhoto(
  image,
  crop,
  { size = PHOTO_RULES.outputSize, quality = PHOTO_RULES.outputQuality } = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image editing is not available in this browser.')

  // JPEG has no transparency; start from white so PNG transparency stays clean.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, crop.sx, crop.sy, crop.side, crop.side, 0, 0, size, size)

  return canvas.toDataURL('image/jpeg', quality)
}
