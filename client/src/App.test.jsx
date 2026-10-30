import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.jsx'

// Create a mock function that can be used by the mocked authentication hook.
const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('./context/useAuth', () => ({
  useAuth: useAuthMock,
}))

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
  window.history.replaceState({}, '', '/')
})

beforeEach(() => {
  // Default test user: authenticated student.
  useAuthMock.mockReturnValue({
    user: {
      id: 'student-1',
      name: 'Test Student',
      email: 'student@example.com',
      role: 'student',
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })
})

describe('CampusConnect application', () => {
  it('renders the CampusConnect dashboard', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Your campus, connected.',
      }),
    ).toBeInTheDocument()

    expect(screen.getByText('Welcome, Test Student')).toBeInTheDocument()
  })

  it('navigates to the timetable page', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('link', {
        name: /Timetable/,
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Timetable',
      }),
    ).toBeInTheDocument()
  })

  it('switches to dark mode when requested', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Switch to dark mode',
      }),
    )

    expect(document.documentElement).toHaveClass('dark')

    expect(
      screen.getByRole('button', {
        name: 'Switch to light mode',
      }),
    ).toBeInTheDocument()
  })

  it('shows a not-found page for an unknown route', () => {
    window.history.replaceState({}, '', '/unknown-page')

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Page not found',
      }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users to the login page', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    })

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Sign in',
      }),
    ).toBeInTheDocument()

    expect(screen.getByLabelText('College email')).toBeInTheDocument()

    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows a loading state while restoring the session', () => {
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    })

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session...',
    )
  })

  it('shows the authenticated user profile', () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'admin-1',
        name: 'Campus Administrator',
        email: 'admin@example.com',
        role: 'admin',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    })

    render(<App />)

    expect(
      screen.getByText('Welcome, Campus Administrator'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open profile menu',
      }),
    )

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()

    expect(screen.getByText('admin')).toBeInTheDocument()

    expect(
      screen.getByRole('menuitem', {
        name: /Logout/,
      }),
    ).toBeInTheDocument()
  })

  it('calls the logout function when the user clicks Logout', async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue({
      user: {
        id: 'admin-1',
        name: 'Campus Administrator',
        email: 'admin@example.com',
        role: 'admin',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: logoutMock,
      refreshSession: vi.fn(),
    })

    render(<App />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open profile menu',
      }),
    )

    fireEvent.click(
      screen.getByRole('menuitem', {
        name: /Logout/,
      }),
    )

    expect(logoutMock).toHaveBeenCalledTimes(1)
  })
})
