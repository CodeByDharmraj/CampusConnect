import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.jsx'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('./context/useAuth', () => ({
  useAuth: useAuthMock,
}))

function setAuthenticatedUser(role) {
  useAuthMock.mockReturnValue({
    user: {
      id: `${role}-1`,
      name: `Test ${role}`,
      email: `${role}@example.com`,
      role,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })

  window.history.replaceState({}, '', '/design-system')
}

beforeEach(() => {
  setAuthenticatedUser('admin')
})

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

describe('Design System route access', () => {
  it('allows administrators to access the Design System in development', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Design System' }),
    ).toBeInTheDocument()
  })

  it.each(['student', 'faculty', 'coordinator'])(
    'redirects %s away from the Design System',
    (role) => {
      setAuthenticatedUser(role)

      render(<App />)

      expect(
        screen.queryByRole('heading', { name: 'Design System' }),
      ).not.toBeInTheDocument()

      expect(
        screen.getByRole('heading', {
          name: 'Your campus, connected.',
        }),
      ).toBeInTheDocument()
    },
  )

  it('does not add the Design System to the sidebar navigation', () => {
    render(<App />)

    expect(
      screen.queryByRole('link', { name: /Design System/i }),
    ).not.toBeInTheDocument()
  })
})
