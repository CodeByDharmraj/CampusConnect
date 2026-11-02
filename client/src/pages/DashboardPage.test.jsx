
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { useAuthMock, apiClientMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiClientMock: { get: vi.fn() },
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: useAuthMock,
}))

vi.mock('../lib/apiClient.js', () => ({
  apiClient: apiClientMock,
}))

import DashboardPage from './DashboardPage.jsx'

function renderDashboard({ role = 'student', metrics = [] } = {}) {
  useAuthMock.mockReturnValue({
    user: {
      name: 'Aarav Student',
      role,
    },
    accessToken: 'dashboard-token',
    isLoading: false,
  })

  apiClientMock.get.mockImplementation((url) => {
    let data

    if (url === '/dashboard/summary') {
      data = { summary: { metrics } }
    } else if (url === '/courses') {
      data = { courses: [] }
    } else if (url === '/assignments') {
      data = { assignments: [] }
    } else if (url === '/timetable') {
      data = { entries: [] }
    } else if (url === '/departments') {
      data = { departments: [] }
    } else {
      return Promise.reject(new Error(`Unexpected API request: ${url}`))
    }

    // Match the Axios response shape consumed by DashboardPage.
    return Promise.resolve({ data })
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DashboardPage metric cards', () => {
  it('renders role greeting and server-provided metric cards', async () => {
    renderDashboard({
      metrics: [
        {
          key: 'enrolledCourses',
          label: 'Enrolled courses',
          value: 5,
          description: 'Across active semesters',
        },
        {
          key: 'attendance',
          label: 'Attendance',
          value: '92%',
          description: 'Current average',
        },
      ],
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Welcome, Aarav Student',
      }),
    ).toBeInTheDocument()

    expect(await screen.findByText('Enrolled courses')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('Current average')).toBeInTheDocument()
  })

  it('shows permitted empty states when dashboard collections are empty', async () => {
    renderDashboard()

    expect(
      await screen.findByText(
        'No courses are currently available in your permitted view.',
      ),
    ).toBeInTheDocument()

    expect(
      await screen.findByText(
        'No assignments are available in your permitted view.',
      ),
    ).toBeInTheDocument()
  })

  it('does not request department data for a student role', async () => {
    renderDashboard({ role: 'student' })

    await screen.findByRole('heading', {
      name: 'At a glance',
    })

    expect(apiClientMock.get).not.toHaveBeenCalledWith(
      '/departments',
      expect.anything(),
    )

    expect(
      screen.queryByRole('heading', {
        name: 'Departments',
      }),
    ).not.toBeInTheDocument()
  })

  it('loads the department section for coordinator users', async () => {
    renderDashboard({ role: 'coordinator' })

    expect(
      await screen.findByRole('heading', {
        name: 'Departments',
      }),
    ).toBeInTheDocument()

    expect(apiClientMock.get).toHaveBeenCalledWith(
      '/departments',
      expect.objectContaining({
        headers: expect.any(Object),
      }),
    )
  })
})
