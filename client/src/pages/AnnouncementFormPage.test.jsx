import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AnnouncementFormPage from './AnnouncementFormPage.jsx'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('../context/useAuth', () => ({
  useAuth: useAuthMock,
}))

function renderPage(user) {
  useAuthMock.mockReturnValue({ user })

  return render(
    <MemoryRouter>
      <AnnouncementFormPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AnnouncementFormPage', () => {
  it('allows students to read announcements without a publishing form', () => {
    renderPage({
      id: 'student-1',
      name: 'Test Student',
      role: 'student',
    })

    expect(
      screen.getByRole('heading', { name: 'Read-only announcement access' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Review the upcoming assessment schedule'),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: /Add.*announcement to preview/ }),
    ).not.toBeInTheDocument()
  })

  it('shows course-scoped preview publishing to faculty', () => {
    renderPage({
      id: 'faculty-1',
      name: 'Test Faculty',
      role: 'faculty',
    })

    expect(
      screen.getByRole('heading', { name: 'Create a course announcement' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Only courses assigned to the authenticated faculty member/,
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Course reference'), {
      target: { value: 'CSE301' },
    })

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Database assessment update' },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'Please review the upcoming database assessment.' },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add course announcement to preview',
      }),
    )

    expect(screen.getByText('Database assessment update')).toBeInTheDocument()
    expect(screen.getByText('Preview target: CSE301')).toBeInTheDocument()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Nothing was published or saved to the database.',
    )
  })

  it('shows department-scoped preview publishing to coordinators', () => {
    renderPage({
      id: 'coordinator-1',
      name: 'Test Coordinator',
      role: 'coordinator',
      departmentId: 'department-123',
    })

    expect(
      screen.getByRole('heading', {
        name: 'Create a department announcement',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Department reference: department-123'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Department meeting update' },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'The department meeting will take place tomorrow.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add department announcement to preview',
      }),
    )

    expect(screen.getByText('Department meeting update')).toBeInTheDocument()

    expect(
      screen.getByText('Preview target: department-123'),
    ).toBeInTheDocument()
  })

  it('shows institution-wide preview publishing to administrators', () => {
    renderPage({
      id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    expect(
      screen.getByRole('heading', {
        name: 'Create an institution-wide announcement',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Intended audience: Entire institution'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Campus-wide update' },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: {
        value: 'Important information for the entire institution.',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add institution announcement to preview',
      }),
    )

    expect(screen.getByText('Campus-wide update')).toBeInTheDocument()

    expect(
      screen.getByText('Preview target: Entire institution'),
    ).toBeInTheDocument()
  })

  it('validates required announcement fields', () => {
    renderPage({
      id: 'admin-1',
      name: 'Test Administrator',
      role: 'admin',
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add institution announcement to preview',
      }),
    )

    expect(screen.getByText('Enter an announcement title.')).toBeInTheDocument()

    expect(
      screen.getByText('Enter the announcement details.'),
    ).toBeInTheDocument()
  })

  it('requires a course reference in the faculty prototype', () => {
    renderPage({
      id: 'faculty-1',
      name: 'Test Faculty',
      role: 'faculty',
    })

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Course announcement' },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'Please read this course announcement.' },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Add course announcement to preview',
      }),
    )

    expect(
      screen.getByText('Enter a course reference for this prototype preview.'),
    ).toBeInTheDocument()
  })

  it('does not expose a publishing form to an unknown role', () => {
    renderPage({
      id: 'unknown-1',
      name: 'Unknown User',
      role: 'unknown',
    })

    expect(
      screen.queryByRole('button', { name: /Add.*announcement to preview/ }),
    ).not.toBeInTheDocument()
  })
})
