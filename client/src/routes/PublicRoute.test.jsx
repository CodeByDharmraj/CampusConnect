import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))
vi.mock('../context/useAuth.js', () => ({ useAuth: useAuthMock }))
import PublicRoute from './PublicRoute.jsx'

function renderPublic(auth, initialEntry = '/login') {
  useAuthMock.mockReturnValue(auth)
  return render(<MemoryRouter initialEntries={[initialEntry]}><Routes>
    <Route element={<PublicRoute />}><Route path="/login" element={<h1>Login</h1>} /></Route>
    <Route path="/" element={<h1>Dashboard</h1>} />
    <Route path="/grades" element={<h1>Grades</h1>} />
  </Routes></MemoryRouter>)
}
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('PublicRoute', () => {
  it('waits for session restoration', () => {
    renderPublic({ isLoading: true, isAuthenticated: false })
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session')
  })
  it('renders the public page for a guest', () => {
    renderPublic({ isLoading: false, isAuthenticated: false })
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })
  it('redirects authenticated users to the dashboard by default', () => {
    renderPublic({ isLoading: false, isAuthenticated: true })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
  it('returns authenticated users to their original destination', () => {
    renderPublic({ isLoading: false, isAuthenticated: true }, { pathname: '/login', state: { from: { pathname: '/grades' } } })
    expect(screen.getByRole('heading', { name: 'Grades' })).toBeInTheDocument()
  })
})
