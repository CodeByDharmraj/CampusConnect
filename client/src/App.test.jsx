import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.jsx'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('./context/useAuth', () => ({
  useAuth: useAuthMock,
}))

function createAuthenticatedUser(role = 'student') {
  return {
    user: {
      id: `${role}-1`,
      name: `Test ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
      email: `${role}@example.com`,
      role,
    },
    accessToken: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }
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
  it('renders the CampusConnect dashboard', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'At a glance',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', {
        name: 'Welcome, Test Student',
      }),
    ).toBeInTheDocument()
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
      accessToken: null,
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
      accessToken: null,
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
      ...createAuthenticatedUser('admin'),
      user: {
        id: 'admin-1',
        name: 'Campus Administrator',
        email: 'admin@example.com',
        role: 'admin',
      },
    })

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Welcome, Campus Administrator',
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open profile menu',
      }),
    )

    const profileMenu = screen.getByRole('menu')

    expect(
      within(profileMenu).getByText('admin@example.com'),
    ).toBeInTheDocument()

    expect(within(profileMenu).getByText('admin')).toBeInTheDocument()

    expect(
      within(profileMenu).getByRole('menuitem', {
        name: /Logout/,
      }),
    ).toBeInTheDocument()
  })

  it('calls the logout function when the user clicks Logout', () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined)

    useAuthMock.mockReturnValue({
      ...createAuthenticatedUser('admin'),
      user: {
        id: 'admin-1',
        name: 'Campus Administrator',
        email: 'admin@example.com',
        role: 'admin',
      },
      logout: logoutMock,
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

  const roleNavigationExpectations = [
    {
      role: 'student',
      visible: [
        'Dashboard',
        'My Courses',
        'Timetable',
        'Assignments',
        'Attendance',
        'Announcements',
        'Clubs & Events',
        'Grades & Feedback',
      ],
      hidden: [
        'Submissions',
        'Faculty-Course Management',
        'Department Management',
        'Faculty Management',
        'Institutional Settings',
      ],
    },
    {
      role: 'faculty',
      visible: [
        'Dashboard',
        'My Courses',
        'Timetable',
        'Assignments',
        'Attendance',
        'Announcements',
        'Clubs & Events',
        'Grades & Feedback',
        'Submissions',
      ],
      hidden: [
        'Faculty-Course Management',
        'Department Management',
        'Faculty Management',
        'Institutional Settings',
      ],
    },
    {
      role: 'coordinator',
      visible: [
        'Dashboard',
        'Timetable',
        'Assignments',
        'Attendance',
        'Announcements',
        'Clubs & Events',
        'Submissions',
        'Faculty-Course Management',
      ],
      hidden: [
        'My Courses',
        'Grades & Feedback',
        'Department Management',
        'Faculty Management',
        'Institutional Settings',
      ],
    },
    {
      role: 'admin',
      visible: [
        'Dashboard',
        'Timetable',
        'Assignments',
        'Attendance',
        'Announcements',
        'Clubs & Events',
        'Grades & Feedback',
        'Submissions',
        'Faculty-Course Management',
        'Department Management',
        'Faculty Management',
        'Institutional Settings',
      ],
      hidden: ['My Courses'],
    },
  ]

  it.each(roleNavigationExpectations)(
    'shows the correct navigation for $role',
    ({ role, visible, hidden }) => {
      useAuthMock.mockReturnValue(createAuthenticatedUser(role))

      render(<App />)

      const navigation = within(
        screen.getByRole('navigation', {
          name: 'Main navigation',
        }),
      )

      visible.forEach((label) => {
        expect(
          navigation.getByRole('link', {
            name: new RegExp(label, 'i'),
          }),
        ).toBeInTheDocument()
      })

      hidden.forEach((label) => {
        expect(
          navigation.queryByRole('link', {
            name: new RegExp(label, 'i'),
          }),
        ).not.toBeInTheDocument()
      })
    },
  )

  const directRouteExpectations = [
    {
      role: 'student',
      path: '/faculty-course-management',
      expectedHeading: 'At a glance',
    },
    {
      role: 'faculty',
      path: '/departments',
      expectedHeading: 'At a glance',
    },
    {
      role: 'coordinator',
      path: '/grades',
      expectedHeading: 'At a glance',
    },
    {
      role: 'student',
      path: '/grades',
      expectedHeading: 'Grades & Feedback',
    },
    {
      role: 'faculty',
      path: '/submissions',
      expectedHeading: 'Submissions',
    },
    {
      role: 'coordinator',
      path: '/submissions',
      expectedHeading: 'Submissions',
    },
    {
      role: 'admin',
      path: '/departments',
      expectedHeading: 'Department Management',
    },
  ]

  it.each(directRouteExpectations)(
    '$role accessing $path receives the correct route access',
    ({ role, path, expectedHeading }) => {
      useAuthMock.mockReturnValue(createAuthenticatedUser(role))

      window.history.replaceState({}, '', path)

      render(<App />)

      expect(
        screen.getByRole('heading', {
          name: expectedHeading,
        }),
      ).toBeInTheDocument()
    },
  )

  it('redirects an unauthenticated user from a protected management route', () => {
    useAuthMock.mockReturnValue({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    })

    window.history.replaceState({}, '', '/faculty-course-management')

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Sign in',
      }),
    ).toBeInTheDocument()
  })
})
