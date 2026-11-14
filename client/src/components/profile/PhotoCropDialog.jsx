import { useEffect, useId, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import {
  PHOTO_RULES,
  computeCropRect,
  getPreviewImageStyle,
  loadImageFromFile,
  panFromDrag,
  renderCroppedPhoto,
} from '../../lib/profilePhoto.js'
import Button from '../Button.jsx'
import Dialog from '../Dialog.jsx'

const FRAME_SIZE = 224 // px; matches Tailwind's size-56
const KEY_STEP = 0.1

const clampPan = (value) => Math.min(1, Math.max(-1, value))

// Lets the person choose which square of their picture becomes the avatar:
// drag it, use the arrow keys, or zoom with the slider.
//
// The Dialog stays mounted so closing it restores focus to the button that
// opened it; the editor inside is mounted per file so its state starts fresh.
export default function PhotoCropDialog({ file, onClose, onSave }) {
  return (
    <Dialog
      open={Boolean(file)}
      onClose={onClose}
      title="Adjust your photo"
      description="Only the part inside the circle is saved."
      size="sm"
      closeOnBackdrop={false}
    >
      {file && (
        <CropEditor
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  )
}

function CropEditor({ file, onClose, onSave }) {
  const hintId = useId()
  const [loaded, setLoaded] = useState(null)
  const [problem, setProblem] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let revoke = null

    loadImageFromFile(file)
      .then((result) => {
        revoke = result.revoke

        if (cancelled) return

        if (
          result.width < PHOTO_RULES.minDimension ||
          result.height < PHOTO_RULES.minDimension
        ) {
          setProblem(
            `That image is too small. Choose one that is at least ${PHOTO_RULES.minDimension} × ${PHOTO_RULES.minDimension} pixels.`,
          )
          return
        }

        setLoaded(result)
      })
      .catch(() => {
        if (!cancelled) {
          setProblem(
            'That image could not be read. Choose a different JPG, PNG or WebP file.',
          )
        }
      })

    return () => {
      cancelled = true
      revoke?.()
    }
  }, [file])

  const crop = loaded
    ? computeCropRect({
        imageWidth: loaded.width,
        imageHeight: loaded.height,
        zoom,
        panX: pan.x,
        panY: pan.y,
      })
    : null

  function handlePointerDown(event) {
    if (!loaded) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerMove(event) {
    const start = dragRef.current
    if (!start || !loaded) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    dragRef.current = { x: event.clientX, y: event.clientY }

    setPan((current) =>
      panFromDrag({
        pan: current,
        dx,
        dy,
        imageWidth: loaded.width,
        imageHeight: loaded.height,
        zoom,
        frameSize: FRAME_SIZE,
      }),
    )
  }

  function endDrag() {
    dragRef.current = null
  }

  function handleKeyDown(event) {
    const moves = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    }
    const move = moves[event.key]
    if (!move) return

    event.preventDefault()
    setPan((current) => ({
      x: clampPan(current.x + move[0]),
      y: clampPan(current.y + move[1]),
    }))
  }

  function handleSave() {
    try {
      const dataUrl = renderCroppedPhoto(loaded.image, crop)

      if (!onSave(dataUrl)) {
        setProblem(
          'Your browser could not store the photo. Free up space or allow site storage, then try again.',
        )
      }
    } catch {
      setProblem('The photo could not be prepared. Try a different image.')
    }
  }

  return (
    <div className="space-y-5">
      <div
        role="group"
        tabIndex={loaded ? 0 : -1}
        aria-label="Photo position"
        aria-describedby={hintId}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative mx-auto size-56 cursor-grab touch-none select-none overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing dark:bg-slate-800 dark:ring-slate-600"
      >
        {loaded && (
          <img
            src={loaded.src}
            alt=""
            draggable={false}
            // Inline style on purpose: the global `img { max-width: 100% }`
            // rule would otherwise squash the zoomed image back into the frame.
            style={{
              position: 'absolute',
              maxWidth: 'none',
              ...getPreviewImageStyle({
                imageWidth: loaded.width,
                imageHeight: loaded.height,
                crop,
                frameSize: FRAME_SIZE,
              }),
            }}
          />
        )}
      </div>

      <p id={hintId} className="text-center text-xs text-slate-500 dark:text-slate-400">
        Drag the photo or use the arrow keys to move it.
      </p>

      <div className="flex items-center gap-3">
        <Minus size={16} aria-hidden="true" className="shrink-0 text-slate-500" />
        <input
          type="range"
          aria-label="Zoom"
          min="1"
          max={PHOTO_RULES.maxZoom}
          step="0.05"
          value={zoom}
          disabled={!loaded}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full"
        />
        <Plus size={16} aria-hidden="true" className="shrink-0 text-slate-500" />
      </div>

      {problem && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {problem}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!loaded}>
          Save photo
        </Button>
      </div>
    </div>
  )
}
