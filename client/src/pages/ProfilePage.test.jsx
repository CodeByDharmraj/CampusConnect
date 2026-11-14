import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ToastProvider from '../context/ToastProvider.jsx'
import { getProfilePhotoKey } from '../lib/profilePhoto.js'
import ProfilePage from './ProfilePage.jsx'

const { useAuthMock, loadImageMock, renderMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  loadImageMock: vi.fn(),
  renderMock: vi.fn(),
}))

vi.mock('../context/useAuth', () => ({ useAuth: useAuthMock }))

// jsdom cannot decode images or draw on a canvas, so those two edges are
// faked; the crop maths, validation and storage are the real code.
vi.mock('../lib/profilePhoto.js', async (importOriginal) => ({
  ...(await importOriginal()),
  loadImageFromFile: loadImageMock,
  renderCroppedPhoto: renderMock,
}))

function userFor(role) {
  return { id: `${role}-1`, name: 'Aarav Sharma', email: 'aarav@example.com', role }
}

function renderPage(role = 'student') {
  useAuthMock.mockReturnValue({ user: userFor(role) })
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

const imageFile = (name = 'me.jpg', type = 'image/jpeg', size = 2000) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const chooseFile = (file) =>
  fireEvent.change(screen.getByLabelText('Choose a profile photo'), {
    target: { files: [file] },
  })

beforeEach(() => {
  // jsdom does not implement <dialog> modal methods (same stand-in as Dialog.test.jsx).
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function () {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function () {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }),
  })

  loadImageMock.mockResolvedValue({
    image: {},
    src: 'blob:fake',
    width: 600,
    height: 400,
    revoke: vi.fn(),
  })
  renderMock.mockReturnValue('data:image/jpeg;base64,CROPPED')
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.clearAllMocks()
  delete HTMLDialogElement.prototype.showModal
  delete HTMLDialogElement.prototype.close
})

describe('ProfilePage', () => {
  it('shows the account details', () => {
    renderPage('faculty')

    expect(screen.getByRole('heading', { level: 1, name: 'Your profile' })).toBeInTheDocument()
    const details = screen.getByRole('heading', { name: 'Account details' }).closest('div')
    expect(within(details).getByText('Aarav Sharma')).toBeInTheDocument()
    expect(within(details).getByText('aarav@example.com')).toBeInTheDocument()
    expect(within(details).getByText('faculty')).toBeInTheDocument()
  })

  it('lists only the areas the role can open', () => {
    renderPage('student')
    expect(screen.getByRole('link', { name: 'Timetable' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'User Accounts' })).not.toBeInTheDocument()
  })

  it('lists admin-only areas for admins', () => {
    renderPage('admin')
    expect(screen.getByRole('link', { name: 'User Accounts' })).toBeInTheDocument()
  })

  it('rejects an unsupported file type without opening the editor', () => {
    renderPage()
    chooseFile(imageFile('notes.pdf', 'application/pdf'))

    expect(screen.getByRole('alert')).toHaveTextContent(/JPG, PNG or WebP/)
    expect(loadImageMock).not.toHaveBeenCalled()
  })

  it('rejects an oversized file', () => {
    renderPage()
    chooseFile(imageFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024))
    expect(screen.getByRole('alert')).toHaveTextContent(/5 MB/)
  })

  it('opens the editor for a valid file and saves the cropped photo', async () => {
    const { container } = renderPage()
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument()

    chooseFile(imageFile())

    const dialog = await screen.findByRole('dialog', { name: 'Adjust your photo' })
    const save = within(dialog).getByRole('button', { name: 'Save photo' })
    await waitFor(() => expect(save).toBeEnabled())

    fireEvent.click(save)

    expect(renderMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem(getProfilePhotoKey(userFor('student')))).toBe(
      'data:image/jpeg;base64,CROPPED',
    )
    expect(await screen.findByText('Photo saved.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('img[src^="data:image/jpeg"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
  })

  it('keeps Save disabled and explains when the image is too small', async () => {
    loadImageMock.mockResolvedValue({
      image: {},
      src: 'blob:tiny',
      width: 60,
      height: 60,
      revoke: vi.fn(),
    })
    renderPage()
    chooseFile(imageFile())

    const dialog = await screen.findByRole('dialog', { name: 'Adjust your photo' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/at least 128/)
    expect(within(dialog).getByRole('button', { name: 'Save photo' })).toBeDisabled()
  })

  it('tells the user when the browser cannot store the photo, and keeps the editor open', async () => {
    renderPage()
    chooseFile(imageFile())

    const dialog = await screen.findByRole('dialog', { name: 'Adjust your photo' })
    const save = within(dialog).getByRole('button', { name: 'Save photo' })
    await waitFor(() => expect(save).toBeEnabled())

    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    try {
      fireEvent.click(save)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/could not store/)
      expect(screen.getByRole('dialog', { name: 'Adjust your photo' })).toBeInTheDocument()
    } finally {
      storageSpy.mockRestore()
    }
  })

  it('cancels without saving anything', async () => {
    renderPage()
    chooseFile(imageFile())
    const dialog = await screen.findByRole('dialog', { name: 'Adjust your photo' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.localStorage.length).toBe(0)
  })

  it('removes an existing photo', () => {
    window.localStorage.setItem(
      getProfilePhotoKey(userFor('student')),
      'data:image/jpeg;base64,AAAA',
    )
    const { container } = renderPage()
    expect(container.querySelector('img[src^="data:image"]')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))

    expect(window.localStorage.length).toBe(0)
    expect(container.querySelector('img[src^="data:image"]')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
  })

  it('keeps one user’s photo away from another user', () => {
    window.localStorage.setItem(
      getProfilePhotoKey(userFor('faculty')),
      'data:image/jpeg;base64,AAAA',
    )
    const { container } = renderPage('student')
    expect(container.querySelector('img[src^="data:image"]')).not.toBeInTheDocument()
  })
})
