import { StrictMode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '../lib/authApi.js'
import AuthProvider from './AuthProvider.jsx'
import { useAuth } from './useAuth.js'

vi.mock('../lib/authApi.js', () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}))

function AuthConsumer() {
  const { user, accessToken, isAuthenticated, isLoading, login, logout } =
    useAuth()

  return (
    <div>
      <p data-testid="user">{user?.name || 'Guest'}</p>
      <p data-testid="token">{accessToken || 'No token'}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="loading">{String(isLoading)}</p>

      <button
        type="button"
        onClick={() =>
          login({ email: 'student@example.edu', password: 'password123' })
        }
      >
        Login
      </button>

      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authApi.refresh.mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', name: 'Test Student', role: 'student' },
        accessToken: 'refreshed-token',
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('restores an existing session on initialization', async () => {
    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test Student')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('starts unauthenticated when refresh fails', async () => {
    authApi.refresh.mockRejectedValue(new Error('No valid session'))

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Guest')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('authenticates a user after successful login', async () => {
    authApi.login.mockResolvedValue({
      success: true,
      data: {
        user: { id: '2', name: 'Another Student', role: 'student' },
        accessToken: 'login-token',
      },
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Another Student')
      expect(screen.getByTestId('token')).toHaveTextContent('login-token')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
  })

  it('clears authentication state after logout', async () => {
    authApi.logout.mockResolvedValue({
      success: true,
      message: 'Logged out successfully.',
    })

    renderAuthProvider()

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Guest')
      expect(screen.getByTestId('token')).toHaveTextContent('No token')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    })
  })

  it('shares one refresh request under React StrictMode', async () => {
    let resolveRefresh

    authApi.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )

    render(
      <StrictMode>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </StrictMode>,
    )

    await waitFor(() => {
      expect(authApi.refresh).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      resolveRefresh({
        success: true,
        data: {
          user: { id: '1', name: 'Test Student', role: 'student' },
          accessToken: 'refreshed-token',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    })
  })
})
