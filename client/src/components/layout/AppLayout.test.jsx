import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../../App.jsx'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('../../context/useAuth', () => ({
  useAuth: useAuthMock,
}))

function authenticated(role = 'student', overrides = {}) {
  return {
    user: {
      id: `${role}-1`,
      name: `Test ${role}`,
      email: `${role}@example.com`,
      role,
    },
    accessToken: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn(),
    ...overrides,
  }
}

const unauthenticated = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

function setRoute(path) {
  window.history.replaceState({}, '', path)
}

async function pageReady() {
  await waitFor(() =>
    expect(screen.queryByLabelText('Loading page')).not.toBeInTheDocument(),
  )
}

function openDrawer() {
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
  return screen.getByRole('dialog', { name: 'Mobile navigation' })
}

beforeEach(() => {
  useAuthMock.mockReturnValue(unauthenticated)
  setRoute('/login')
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('mobile navigation drawer', () => {
  it('opens with focus on the close button and updates aria state', async () => {
    render(<App />)
    await pageReady()

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')

    const drawer = openDrawer()

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation')
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(
      within(drawer).getByRole('button', { name: 'Close navigation menu' }),
    ).toHaveFocus()
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    render(<App />)
    await pageReady()

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    openDrawer()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes from the backdrop and restores focus to the trigger', async () => {
    render(<App />)
    await pageReady()

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    openDrawer()

    // The backdrop is the first "Close navigation menu" button in the DOM.
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Close navigation menu' })[0],
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the open drawer', async () => {
    render(<App />)
    await pageReady()

    const drawer = openDrawer()
    const closeButton = within(drawer).getByRole('button', {
      name: 'Close navigation menu',
    })
    const themeButton = within(drawer).getByRole('button', {
      name: /switch to (light|dark) mode/i,
    })

    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true })
    expect(themeButton).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: 'Tab' })
    expect(closeButton).toHaveFocus()
  })

  it('closes when a navigation link inside it is chosen', async () => {
    useAuthMock.mockReturnValue(authenticated('student'))
    setRoute('/')
    render(<App />)
    await pageReady()

    const drawer = openDrawer()
    fireEvent.click(within(drawer).getByRole('link', { name: 'Timetable' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/timetable')
    await pageReady()
  })

  it('does not steal focus back when the shell re-renders while open', async () => {
    useAuthMock.mockReturnValue(authenticated('admin'))
    setRoute('/')
    render(<App />)
    await pageReady()

    const drawer = openDrawer()
    const themeButton = within(drawer).getByRole('button', {
      name: /switch to (light|dark) mode/i,
    })

    // Moving focus elsewhere in the drawer and toggling theme re-renders
    // AppLayout; focus must stay where the user put it.
    themeButton.focus()
    fireEvent.click(themeButton)

    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /switch to (light|dark) mode/i,
      }),
    ).toHaveFocus()
  })
})

describe('theme toggle', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue(authenticated('student'))
    setRoute('/')
  })

  it('starts from the current document theme', async () => {
    document.documentElement.classList.add('dark')
    render(<App />)
    await pageReady()

    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument()
  })

  it('keeps the desktop and drawer toggles in sync', async () => {
    render(<App />)
    await pageReady()

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(document.documentElement).toHaveClass('dark')

    const drawer = openDrawer()
    fireEvent.click(
      within(drawer).getByRole('button', { name: 'Switch to light mode' }),
    )
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(document.documentElement).not.toHaveClass('dark')
    // The always-mounted desktop toggle must reflect the change made in the drawer.
    expect(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    ).toBeInTheDocument()
  })
})

describe('logout', () => {
  it('navigates to /login and closes the profile menu even if the request fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logout = vi.fn().mockRejectedValue(new Error('network down'))
    useAuthMock.mockReturnValue(authenticated('student', { logout }))
    setRoute('/timetable')

    render(<App />)
    await pageReady()

    fireEvent.click(screen.getByRole('button', { name: 'Open profile menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(logout).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      'Logout request failed:',
      expect.any(Error),
    )
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    consoleError.mockRestore()
  })
})
