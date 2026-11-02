
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: useAuthMock,
}))

import ProtectedRoute from './ProtectedRoute.jsx'

function Location() {
  const location = useLocation()

  return <output data-testid="location">{location.pathname}</output>
}

function renderRoute(auth, path = '/private') {
  useAuthMock.mockReturnValue(auth)

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<h1>Login screen</h1>} />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/private"
            element={<h1>Private content</h1>}
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
          <Route
            path="/faculty"
            element={<h1>Faculty content</h1>}
          />
        </Route>

        <Route path="/" element={<h1>Dashboard</h1>} />
      </Routes>

      <Location />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('shows a loading status while session restoration is pending', () => {
    renderRoute({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    })

    expect(
      screen.getByText('Checking your session...'),
    ).toBeInTheDocument()
  })

  it('redirects guests to login and retains the requested location', () => {
    renderRoute({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    })

    expect(
      screen.getByRole('heading', {
        name: 'Login screen',
      }),
    ).toBeInTheDocument()

    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('renders protected content for an authenticated user', () => {
    renderRoute({
      isLoading: false,
      isAuthenticated: true,
      user: { role: 'student' },
    })

    expect(
      screen.getByRole('heading', {
        name: 'Private content',
      }),
    ).toBeInTheDocument()
  })

  it('redirects an authenticated user with the wrong role to dashboard', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { role: 'student' },
      },
      '/faculty',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Dashboard',
      }),
    ).toBeInTheDocument()
  })

  it('allows an authorized role', () => {
    renderRoute(
      {
        isLoading: false,
        isAuthenticated: true,
        user: { role: 'faculty' },
      },
      '/faculty',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Faculty content',
      }),
    ).toBeInTheDocument()
  })
})
