import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PHOTO_RULES,
  computeCropRect,
  getPreviewImageStyle,
  getProfilePhotoKey,
  panFromDrag,
  readProfilePhoto,
  removeProfilePhoto,
  subscribeToProfilePhoto,
  validatePhotoFile,
  writeProfilePhoto,
} from './profilePhoto.js'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('computeCropRect', () => {
  it('centres the largest square on a landscape image at zoom 1', () => {
    expect(computeCropRect({ imageWidth: 600, imageHeight: 400 })).toEqual({
      sx: 100,
      sy: 0,
      side: 400,
    })
  })

  it('centres the largest square on a portrait image at zoom 1', () => {
    expect(computeCropRect({ imageWidth: 400, imageHeight: 600 })).toEqual({
      sx: 0,
      sy: 100,
      side: 400,
    })
  })

  it('shrinks the square as zoom increases', () => {
    const crop = computeCropRect({ imageWidth: 600, imageHeight: 400, zoom: 2 })
    expect(crop.side).toBe(200)
    expect(crop).toMatchObject({ sx: 200, sy: 100 })
  })

  it('never lets the crop leave the image, however far pan goes', () => {
    for (const pan of [-5, -1, 0, 1, 5]) {
      const { sx, sy, side } = computeCropRect({
        imageWidth: 600,
        imageHeight: 400,
        zoom: 3,
        panX: pan,
        panY: pan,
      })
      expect(sx).toBeGreaterThanOrEqual(0)
      expect(sy).toBeGreaterThanOrEqual(0)
      expect(sx + side).toBeLessThanOrEqual(600)
      expect(sy + side).toBeLessThanOrEqual(400)
    }
  })

  it('clamps zoom to the allowed range', () => {
    const low = computeCropRect({ imageWidth: 500, imageHeight: 500, zoom: 0.1 })
    const high = computeCropRect({ imageWidth: 500, imageHeight: 500, zoom: 99 })
    expect(low.side).toBe(500)
    expect(high.side).toBe(500 / PHOTO_RULES.maxZoom)
  })
})

describe('panFromDrag', () => {
  const base = { imageWidth: 600, imageHeight: 400, zoom: 2, frameSize: 224 }

  it('moves the view the opposite way to the drag', () => {
    const next = panFromDrag({ ...base, pan: { x: 0, y: 0 }, dx: 50, dy: 0 })
    expect(next.x).toBeLessThan(0)
  })

  it('keeps pan within -1..1', () => {
    const next = panFromDrag({ ...base, pan: { x: 0, y: 0 }, dx: -100000, dy: 100000 })
    expect(next.x).toBe(1)
    expect(next.y).toBe(-1)
  })

  it('does not move on an axis with no spare room', () => {
    const next = panFromDrag({
      ...base,
      zoom: 1,
      pan: { x: 0, y: 0 },
      dx: 40,
      dy: 40,
    })
    expect(next.y).toBe(0)
  })
})

describe('getPreviewImageStyle', () => {
  it('scales and offsets the image so the crop fills the frame', () => {
    const crop = { sx: 100, sy: 0, side: 400 }
    expect(
      getPreviewImageStyle({ imageWidth: 600, imageHeight: 400, crop, frameSize: 200 }),
    ).toEqual({ width: 300, height: 200, left: -50, top: -0 })
  })
})

describe('validatePhotoFile', () => {
  const file = (type, size) => ({ type, size })

  it('accepts JPG, PNG and WebP under the size limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validatePhotoFile(file(type, 1000))).toBeNull()
    }
  })

  it('rejects other types with guidance', () => {
    expect(validatePhotoFile(file('application/pdf', 1000))).toMatch(/JPG, PNG or WebP/)
    expect(validatePhotoFile(file('image/gif', 1000))).toMatch(/not supported/)
  })

  it('rejects files over 5 MB', () => {
    expect(validatePhotoFile(file('image/png', PHOTO_RULES.maxFileBytes + 1))).toMatch(/5 MB/)
    expect(validatePhotoFile(file('image/png', PHOTO_RULES.maxFileBytes))).toBeNull()
  })

  it('asks for a file when none is given', () => {
    expect(validatePhotoFile(undefined)).toMatch(/Choose an image/)
  })
})

describe('photo storage', () => {
  const key = getProfilePhotoKey({ id: 'abc' })

  it('keys photos per user, falling back to _id then email', () => {
    expect(getProfilePhotoKey({ id: '1' })).not.toBe(getProfilePhotoKey({ id: '2' }))
    expect(getProfilePhotoKey({ _id: 'x' })).toContain('x')
    expect(getProfilePhotoKey({ email: 'a@b.c' })).toContain('a@b.c')
    expect(getProfilePhotoKey({})).toBeNull()
    expect(getProfilePhotoKey(null)).toBeNull()
  })

  it('round-trips a photo and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToProfilePhoto(listener)

    expect(writeProfilePhoto(key, 'data:image/jpeg;base64,AAAA')).toBe(true)
    expect(readProfilePhoto(key)).toBe('data:image/jpeg;base64,AAAA')
    expect(listener).toHaveBeenCalledTimes(1)

    removeProfilePhoto(key)
    expect(readProfilePhoto(key)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    writeProfilePhoto(key, 'data:image/jpeg;base64,BBBB')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('never returns stored values that are not image data URLs', () => {
    window.localStorage.setItem(key, 'javascript:alert(1)')
    expect(readProfilePhoto(key)).toBeNull()
  })

  it('reports failure instead of throwing when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeProfilePhoto(key, 'data:image/jpeg;base64,AAAA')).toBe(false)
  })

  it('does nothing without a key', () => {
    expect(writeProfilePhoto(null, 'data:image/jpeg;base64,AAAA')).toBe(false)
    expect(readProfilePhoto(null)).toBeNull()
  })
})
