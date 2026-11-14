import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../App.jsx'
import ToastProvider from '../context/ToastProvider.jsx'

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))
vi.mock('../context/useAuth', () => ({ useAuth: useAuthMock }))

function session(role) {
  return {
    user: role
      ? { id: `${role}-1`, name: 'Test User', email: 't@example.com', role }
      : null,
    isAuthenticated: Boolean(role),
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }
}

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('/profile route', () => {
  it.each(['student', 'faculty', 'coordinator', 'admin'])(
    'is available to a signed-in %s',
    async (role) => {
      useAuthMock.mockReturnValue(session(role))
      window.history.replaceState({}, '', '/profile')
      render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Your profile' }),
      ).toBeInTheDocument()
      expect(window.location.pathname).toBe('/profile')
    },
  )

  it('sends signed-out visitors to the login page', async () => {
    useAuthMock.mockReturnValue(session(null))
    window.history.replaceState({}, '', '/profile')
    render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )

    await waitFor(() => expect(window.location.pathname).toBe('/login'))
  })
})

describe('header branding', () => {
  it('shows the university name and a profile entry for signed-in users', async () => {
    useAuthMock.mockReturnValue(session('student'))
    window.history.replaceState({}, '', '/profile')
    render(
        <ToastProvider>
          <App />
        </ToastProvider>,
      )

    await screen.findByRole('heading', { level: 1, name: 'Your profile' })
    const [header] = screen.getAllByRole('banner') // app header comes first in the DOM
    expect(header).toHaveTextContent('Central University of Jammu')
    expect(header.querySelector('img')).toBeInTheDocument()
  })
})
