
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuthMock, apiClientMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiClientMock: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('../context/useAuth.js', () => ({
  useAuth: useAuthMock,
}))

vi.mock('../lib/apiClient.js', () => ({
  apiClient: apiClientMock,
}))

import StudentSubmissionsPage from './StudentSubmissionsPage.jsx'

function renderPage({
  assignments = [],
  submissions = [],
} = {}) {
  useAuthMock.mockReturnValue({
    accessToken: 'test-token',
  })

  apiClientMock.get.mockImplementation((url) => {
    if (url === '/assignments') {
      return Promise.resolve({
        data: {
          data: {
            assignments,
          },
        },
      })
    }

    if (url === '/submissions/my') {
      return Promise.resolve({
        data: {
          data: {
            submissions,
          },
        },
      })
    }

    return Promise.reject(
      new Error(`Unexpected GET request: ${url}`),
    )
  })

  const client = new QueryClient({
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

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentSubmissionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StudentSubmissionsPage', () => {
  it('renders an empty assignment state when no assignments exist', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'No published assignments',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Published assignments for your enrolled courses will appear here.',
      ),
    ).toBeInTheDocument()
  })

  it('shows assignment details and submission action', async () => {
    renderPage({
      assignments: [
        {
          _id: 'a1',
          title: 'Build an API',
          description: 'Create REST endpoints',
          dueDate: '2027-01-01T00:00:00.000Z',
          status: 'published',
        },
      ],
    })

    expect(
      await screen.findByText('Build an API'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /Submit assignment/i,
      }),
    ).toBeInTheDocument()
  })

  it('shows the current submission status and resubmission action', async () => {
    renderPage({
      assignments: [
        {
          _id: 'a1',
          title: 'Build an API',
          description: 'Create REST endpoints',
          dueDate: '2027-01-01T00:00:00.000Z',
          status: 'published',
        },
      ],
      submissions: [
        {
          _id: 's1',
          assignmentId: 'a1',
          status: 'submitted',
          currentVersion: 1,
          submittedAt: '2026-10-30T10:00:00.000Z',
          versions: [
            {
              version: 1,
              files: [
                {
                  originalName: 'api.zip',
                  size: 1024,
                },
              ],
            },
          ],
        },
      ],
    })

    expect(
      await screen.findByText('Build an API'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(apiClientMock.get).toHaveBeenCalledWith(
        '/assignments',
        expect.any(Object),
      )

      expect(apiClientMock.get).toHaveBeenCalledWith(
        '/submissions/my',
        expect.any(Object),
      )
    })

    expect(
      await screen.findByText('Submitted'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /Submit new version/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByText(/api\.zip/)).toBeInTheDocument()
  })

  it('reports an assignment query failure and offers retry', async () => {
    useAuthMock.mockReturnValue({
      accessToken: 'test-token',
    })

    apiClientMock.get.mockRejectedValue(
      new Error('Unable to load assignments'),
    )

    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StudentSubmissionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText('Unable to load your submissions.'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Unable to load assignments'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /Try again/i,
      }),
    ).toBeInTheDocument()
  })
})
