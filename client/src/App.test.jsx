import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import App from './App.jsx'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('./context/useAuth', () => ({
  useAuth: useAuthMock,
}))

function createAuthenticatedUser(role = 'student', overrides = {}) {
  const { user: userOverrides = {}, ...stateOverrides } = overrides

  return {
    user: {
      id: `${role}-1`,
      name: `Test ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
      email: `${role}@example.com`,
      role,
      ...userOverrides,
    },
    accessToken: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...stateOverrides,
  }
}

function createUnauthenticatedUser(overrides = {}) {
  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  }
}

function setRoute(path) {
  window.history.replaceState({}, '', path)
}

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

beforeEach(() => {
  useAuthMock.mockReturnValue(createAuthenticatedUser('student'))
})

describe('CampusConnect application', () => {
  it('renders the student dashboard with the correct greeting', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'At a glance' }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', {
        name: 'Welcome, Test Student',
      }),
    ).toBeInTheDocument()
  })

  it('navigates to the timetable page', async () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('link', {
        name: 'Timetable',
        exact: true,
      }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Timetable' }),
    ).toBeInTheDocument()
  })

  it('switches to dark mode and exposes the light-mode action', () => {
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    )

    expect(document.documentElement).toHaveClass('dark')
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument()
  })

  it('renders the not-found page for an unknown route', async () => {
    setRoute('/this-route-does-not-exist')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /page not found/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated users to the login page', async () => {
    useAuthMock.mockReturnValue(createUnauthenticatedUser())
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('College email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows a loading state while the session is being restored', () => {
    useAuthMock.mockReturnValue(
      createUnauthenticatedUser({ isLoading: true }),
    )
    render(<App />)

    expect(
      screen.getByText('Checking your session...'),
    ).toBeInTheDocument()
  })

  it('shows the authenticated user profile menu', async () => {
    useAuthMock.mockReturnValue(
      createAuthenticatedUser('admin', {
        user: {
          name: 'Campus Administrator',
          email: 'admin@example.com',
        },
      }),
    )
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Open profile menu' }),
    )

    const profileMenu = screen.getByRole('menu')
    expect(
      within(profileMenu).getByText('admin@example.com'),
    ).toBeInTheDocument()
    expect(within(profileMenu).getByText('admin')).toBeInTheDocument()
    expect(
      within(profileMenu).getByRole('menuitem', { name: /logout/i }),
    ).toBeInTheDocument()
  })

  it('calls logout when the user selects Logout', () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue(
      createAuthenticatedUser('admin', {
        user: {
          name: 'Campus Administrator',
          email: 'admin@example.com',
        },
        logout: logoutMock,
      }),
    )
    render(<App />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Open profile menu' }),
    )
    fireEvent.click(
      screen.getByRole('menuitem', { name: /logout/i }),
    )

    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['student', '/faculty-course-management'],
    ['faculty', '/departments'],
    ['coordinator', '/grades'],
  ])(
    'redirects %s away from a route that role cannot access',
    async (role, path) => {
      useAuthMock.mockReturnValue(createAuthenticatedUser(role))
      setRoute(path)
      render(<App />)

      expect(
        await screen.findByRole('heading', { name: 'At a glance' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          name: `Welcome, Test ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
        }),
      ).toBeInTheDocument()
    },
  )

  it('allows a student to access Grades & Feedback', async () => {
    setRoute('/grades')
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Grades & Feedback',
      }),
    ).toBeInTheDocument()
  })

  it('allows an administrator to access Department Management', async () => {
    useAuthMock.mockReturnValue(createAuthenticatedUser('admin'))
    setRoute('/departments')
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Department Management',
      }),
    ).toBeInTheDocument()
  })

  it('does not expose the Design System in the sidebar navigation', () => {
    useAuthMock.mockReturnValue(createAuthenticatedUser('admin'))
    render(<App />)

    const navigation = within(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    )

    expect(
      navigation.queryByRole('link', { name: /design system/i }),
    ).not.toBeInTheDocument()
  })
})
