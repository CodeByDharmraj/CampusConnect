import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AnnouncementFormPage from './AnnouncementFormPage.jsx'

const { useAuthMock, apiClientMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('../context/useAuth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('../lib/apiClient', () => ({
  apiClient: apiClientMock,
}))

const mockAnnouncements = [
  {
    _id: 'announcement-1',
    title: 'Database assessment update',
    detail: 'The database assessment will take place next Monday.',
    category: 'Academic',
    scope: 'institution',
    publishedAt: '2026-11-01T10:00:00.000Z',
    expiresAt: null,
    authorId: {
      name: 'Test Administrator',
    },
    isRead: false,
  },
]

const mockCourseOfferings = [
  {
    _id: 'offering-1',
    academicYear: '2026-2027',
    semester: 5,
    section: 'A',
    courseId: {
      code: 'CSE301',
      name: 'Database Management Systems',
    },
  },
]

function mockApiResponses({
  announcements = mockAnnouncements,
  courseOfferings = mockCourseOfferings,
} = {}) {
  apiClientMock.get.mockImplementation((url) => {
    if (url === '/announcements') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            announcements,
          },
        },
      })
    }

    if (url === '/announcements/options') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            courseOfferings,
          },
        },
      })
    }

    return Promise.reject(new Error(`Unexpected GET request: ${url}`))
  })

  apiClientMock.post.mockResolvedValue({
    data: {
      success: true,
      data: {
        announcement: {
          _id: 'new-announcement',
        },
      },
    },
  })

  apiClientMock.patch.mockResolvedValue({
    data: {
      success: true,
      message: 'Announcement marked as read.',
    },
  })
}

function renderPage(user, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  useAuthMock.mockReturnValue({
    user,
    accessToken: 'test-access-token',
  })

  mockApiResponses(options)

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AnnouncementFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return {
    ...result,
    queryClient,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('AnnouncementFormPage', () => {
  it('allows students to read announcements without a publishing form', async () => {
    renderPage({
      _id: 'student-1',
      name: 'Test Student',
      role: 'student',
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Announcements',
      }),
    ).toBeInTheDocument()

    expect(
      await screen.findByText('Database assessment update'),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('heading', {
        name: 'Publish announcement',
      }),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Mark as read',
      }),
    ).toBeInTheDocument()
  })

  it('marks a student announcement as read', async () => {
    renderPage({
      _id: 'student-1',
      name: 'Test Student',
      role: 'student',
    })

    const markReadButton = await screen.findByRole('button', {
      name: 'Mark as read',
    })

    fireEvent.click(markReadButton)

    await waitFor(() => {
      expect(apiClientMock.patch).toHaveBeenCalledWith(
        '/announcements/announcement-1/read',
        {},
        {
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        },
      )
    })
  })

  it('shows assigned course offerings to faculty', async () => {
    renderPage({
      _id: 'faculty-1',
      name: 'Test Faculty',
      role: 'faculty',
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Publish announcement',
      }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('option', {
        name: /CSE301.*Database Management Systems/,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByLabelText('Assigned course offering'),
    ).toBeInTheDocument()
  })

  it('publishes a course-scoped announcement as faculty', async () => {
    renderPage({
      _id: 'faculty-1',
      name: 'Test Faculty',
      role: 'faculty',
    })

    await screen.findByRole('option', {
      name: /CSE301.*Database Management Systems/,
    })

    fireEvent.change(screen.getByLabelText('Assigned course offering'), {
      target: {
        value: 'offering-1',
      },
    })

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Database assessment update',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'Please review the upcoming database assessment.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    await waitFor(() => {
      expect(apiClientMock.post).toHaveBeenCalledWith(
        '/announcements',
        {
          title: 'Database assessment update',
          detail: 'Please review the upcoming database assessment.',
          category: 'Academic',
          courseOfferingId: 'offering-1',
        },
        {
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        },
      )
    })

    expect(
      await screen.findByText('Announcement published successfully.'),
    ).toBeInTheDocument()
  })

  it('publishes a department announcement as a coordinator', async () => {
    renderPage({
      _id: 'coordinator-1',
      name: 'Test Coordinator',
      role: 'coordinator',
      departmentId: 'department-123',
    })

    await screen.findByText('Database assessment update')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Department meeting update',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'The department meeting will take place tomorrow.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    await waitFor(() => {
      expect(apiClientMock.post).toHaveBeenCalledWith(
        '/announcements',
        {
          title: 'Department meeting update',
          detail: 'The department meeting will take place tomorrow.',
          category: 'Academic',
        },
        {
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        },
      )
    })
  })

  it('publishes an institution-wide announcement as an administrator', async () => {
    renderPage({
      _id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    await screen.findByText('Database assessment update')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Campus-wide update',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'Important information for the entire institution.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    await waitFor(() => {
      expect(apiClientMock.post).toHaveBeenCalledWith(
        '/announcements',
        {
          title: 'Campus-wide update',
          detail: 'Important information for the entire institution.',
          category: 'Academic',
        },
        {
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        },
      )
    })
  })

  it('validates announcement title length', async () => {
    renderPage({
      _id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    await screen.findByText('Database assessment update')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Hi',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'This is a valid announcement detail.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    expect(
      await screen.findByText('Title must contain at least 5 characters.'),
    ).toBeInTheDocument()

    expect(apiClientMock.post).not.toHaveBeenCalled()
  })

  it('validates announcement details length', async () => {
    renderPage({
      _id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    await screen.findByText('Database assessment update')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Valid announcement title',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'Short',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    expect(
      await screen.findByText('Details must contain at least 10 characters.'),
    ).toBeInTheDocument()

    expect(apiClientMock.post).not.toHaveBeenCalled()
  })

  it('requires faculty to select an assigned course offering', async () => {
    renderPage({
      _id: 'faculty-1',
      name: 'Test Faculty',
      role: 'faculty',
    })

    await screen.findByRole('option', {
      name: /CSE301.*Database Management Systems/,
    })

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Course announcement',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'Please read this course announcement.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    expect(
      await screen.findByText('Select one of your assigned course offerings.'),
    ).toBeInTheDocument()

    expect(apiClientMock.post).not.toHaveBeenCalled()
  })

  it('does not expose publishing controls to students', async () => {
    renderPage({
      _id: 'student-1',
      name: 'Test Student',
      role: 'student',
    })

    await screen.findByText('Database assessment update')

    expect(
      screen.queryByRole('button', {
        name: 'Publish announcement',
      }),
    ).not.toBeInTheDocument()
  })

  it('does not expose publishing controls to unknown roles', async () => {
    renderPage({
      _id: 'unknown-1',
      name: 'Unknown User',
      role: 'unknown',
    })

    await screen.findByText('Database assessment update')

    expect(
      screen.queryByRole('button', {
        name: 'Publish announcement',
      }),
    ).not.toBeInTheDocument()
  })

  it('displays an error when announcements cannot be loaded', async () => {
    useAuthMock.mockReturnValue({
      user: {
        _id: 'student-1',
        name: 'Test Student',
        role: 'student',
      },
      accessToken: 'test-access-token',
    })

    apiClientMock.get.mockRejectedValue(new Error('Network unavailable'))

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AnnouncementFormPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText('Unable to load announcements.'),
    ).toBeInTheDocument()
  })

  it('displays a publishing error returned by the API', async () => {
    apiClientMock.post.mockRejectedValue({
      response: {
        data: {
          message: 'You are not authorized to publish this announcement.',
        },
      },
    })

    renderPage({
      _id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    await screen.findByText('Database assessment update')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: {
        value: 'Valid announcement title',
      },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'This is a valid announcement description.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Publish announcement',
      }),
    )

    expect(
      await screen.findByText(
        'You are not authorized to publish this announcement.',
      ),
    ).toBeInTheDocument()
  })
})
