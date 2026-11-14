import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAuthMock, apiClientMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  apiClientMock: { get: vi.fn(), patch: vi.fn() },
}))

vi.mock('../context/useAuth', () => ({ useAuth: useAuthMock }))
vi.mock('../lib/apiClient', () => ({ apiClient: apiClientMock }))

import { ClubDetailPage } from './ClubDirectoryPage.jsx'

const club = {
  _id: 'c1',
  slug: 'tech-club',
  name: 'Tech Club',
  description: 'A community for students who enjoy building software together.',
  category: 'Technical',
  departmentId: { name: 'Computer Science' },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/clubs-events/tech-club']}>
        <Routes>
          <Route path="/clubs-events/:slug" element={<ClubDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('club editing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClientMock.get.mockResolvedValue({ success: true, data: { club } })
  })

  it('does not offer editing to students', async () => {
    useAuthMock.mockReturnValue({ accessToken: 't', user: { role: 'student' } })
    renderPage()

    expect(await screen.findByText('Tech Club')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit club/i })).not.toBeInTheDocument()
  })

  it('validates and saves changes for administrators', async () => {
    useAuthMock.mockReturnValue({ accessToken: 't', user: { role: 'admin' } })
    apiClientMock.patch.mockResolvedValue({ success: true, data: { club: { ...club, name: 'Tech Society' } } })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /edit club/i }))
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'too short' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/between 20 and 2000/i)).toBeInTheDocument()
    expect(apiClientMock.patch).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Club name'), { target: { value: 'Tech Society' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'An updated description that is comfortably long enough.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(apiClientMock.patch).toHaveBeenCalledWith(
        '/clubs/c1',
        {
          name: 'Tech Society',
          description: 'An updated description that is comfortably long enough.',
          category: 'Technical',
        },
        expect.anything(),
      ),
    )
  })
})
