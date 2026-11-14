import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))
vi.mock('../context/useAuth.js', () => ({ useAuth: () => ({ login: loginMock, isLoading: false }) }))
import LoginFormPage from './LoginFormPage.jsx'

afterEach(() => { cleanup(); vi.clearAllMocks() })
beforeEach(() => { loginMock.mockResolvedValue({ id: 'student-1', role: 'student' }) })

describe('Login form validation regressions', () => {
  it('rejects malformed email before making an authentication request', () => {
    render(<MemoryRouter><LoginFormPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('College email'), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })
  it('trims email whitespace before submitting valid credentials', async () => {
    render(<MemoryRouter><LoginFormPage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('College email'), { target: { value: '  student@example.com  ' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPassword123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await vi.waitFor(() => expect(loginMock).toHaveBeenCalledWith({ email: 'student@example.com', password: 'ValidPassword123!' }))
  })
})
