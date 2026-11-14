import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuthMock, apiClientMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiClientMock: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

vi.mock('../context/useAuth.js', () => ({ useAuth: useAuthMock }))
vi.mock('../lib/apiClient.js', () => ({ apiClient: apiClientMock }))

import AssignmentsPage from './AssignmentsPage.jsx'
import DepartmentManagementPage from './DepartmentManagementPage.jsx'
import GradesPage from './GradesPage.jsx'

// The real apiClient resolves with the server payload: { success, data }.
function payload(data) {
  return Promise.resolve({ success: true, data })
}

function renderPage(page) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('management pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists assignments for a student with the course and due state', async () => {
    useAuthMock.mockReturnValue({ accessToken: 't', user: { role: 'student' } })
    apiClientMock.get.mockImplementation(() =>
      payload({
        assignments: [
          {
            _id: 'a1',
            title: 'Binary Trees',
            description: 'Implement an AVL tree.',
            status: 'published',
            dueDate: '2020-01-01T00:00:00.000Z',
            courseOfferingId: {
              semester: 5,
              section: 'A',
              academicYear: '2026-2027',
              courseId: { code: 'DSA', name: 'Data Structures' },
            },
          },
        ],
      }),
    )

    renderPage(<AssignmentsPage />)

    expect(await screen.findByText('Binary Trees')).toBeInTheDocument()
    expect(screen.getByText(/DSA — Data Structures/)).toBeInTheDocument()
    expect(screen.getByText('Past due')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open submissions/i })).toHaveAttribute('href', '/submissions')
  })

  it('shows only evaluated submissions with grade and feedback on the student grades page', async () => {
    useAuthMock.mockReturnValue({ accessToken: 't', user: { role: 'student' } })
    apiClientMock.get.mockImplementation(() =>
      payload({
        submissions: [
          {
            _id: 's1',
            status: 'evaluated',
            grade: 88,
            feedback: 'Clear and well tested.',
            assignmentId: { title: 'Graphs', courseOfferingId: { courseId: { code: 'DSA', name: 'Data Structures' } } },
          },
          { _id: 's2', status: 'submitted', grade: null, assignmentId: { title: 'Hidden' } },
        ],
      }),
    )

    renderPage(<GradesPage />)

    expect(await screen.findByText('88 / 100')).toBeInTheDocument()
    expect(screen.getByText('Clear and well tested.')).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
    expect(apiClientMock.get).toHaveBeenCalledWith('/submissions/my', expect.anything())
  })

  it('validates and creates a department', async () => {
    useAuthMock.mockReturnValue({ accessToken: 't', user: { role: 'admin' } })
    apiClientMock.get.mockImplementation(() => payload({ departments: [] }))
    apiClientMock.post.mockImplementation(() => payload({ department: { _id: 'd1' } }))

    renderPage(<DepartmentManagementPage />)

    fireEvent.click(await screen.findByRole('button', { name: /create department/i }))
    expect(await screen.findByText(/name must contain between 2 and 100/i)).toBeInTheDocument()
    expect(apiClientMock.post).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: 'Computer Science' } })
    fireEvent.change(screen.getByLabelText(/^code/i), { target: { value: 'cse' } })
    fireEvent.click(screen.getByRole('button', { name: /create department/i }))

    await waitFor(() =>
      expect(apiClientMock.post).toHaveBeenCalledWith(
        '/departments',
        { name: 'Computer Science', code: 'CSE' },
        expect.anything(),
      ),
    )
  })
})
