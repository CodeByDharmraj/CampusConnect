import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

import LoginFormPage from './LoginFormPage.jsx'

const { loginMock } = vi.hoisted(() => ({
    loginMock: vi.fn(),
}))

vi.mock('../context/useAuth.js', () => ({
    useAuth: () => ({
        login: loginMock,
        isLoading: false,
    }),
}))

function CurrentLocation() {
    const location = useLocation()

    return <output data-testid="current-path">{location.pathname}</output>
}

function renderLogin(initialEntry = '/login') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/login" element={<LoginFormPage />} />
                <Route path="/grades" element={<h1>Grades & Feedback</h1>} />
                <Route path="/submissions" element={<h1>Submissions</h1>} />
                <Route path="/" element={<h1>Dashboard</h1>} />
            </Routes>

            <CurrentLocation />
        </MemoryRouter>,
    )
}

async function submitValidCredentials() {
    fireEvent.change(screen.getByLabelText('College email'), {
        target: { value: 'student@example.com' },
    })

    fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'ValidPassword123!' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

beforeEach(() => {
    loginMock.mockReset()
    loginMock.mockResolvedValue({
        id: 'student-1',
        role: 'student',
    })
})

afterEach(() => {
    cleanup()
})

describe('LoginFormPage', () => {
    it('returns to the originally requested page after login', async () => {
        loginMock.mockResolvedValue({
            id: 'student-1',
            role: 'student',
        })

        renderLogin({
            pathname: '/login',
            state: {
                from: {
                    pathname: '/grades',
                },
            },
        })

        await submitValidCredentials()

        expect(
            await screen.findByRole('heading', {
                name: 'Grades & Feedback',
            }),
        ).toBeInTheDocument()

        expect(loginMock).toHaveBeenCalledWith({
            email: 'student@example.com',
            password: 'ValidPassword123!',
        })
    })

    it('redirects to the dashboard when no original destination exists', async () => {
        renderLogin()

        await submitValidCredentials()

        expect(
            await screen.findByRole('heading', {
                name: 'Dashboard',
            }),
        ).toBeInTheDocument()
    })

    it('returns faculty to their originally requested submissions page', async () => {
        loginMock.mockResolvedValue({
            id: 'faculty-1',
            role: 'faculty',
        })

        renderLogin({
            pathname: '/login',
            state: {
                from: {
                    pathname: '/submissions',
                },
            },
        })

        await submitValidCredentials()

        expect(
            await screen.findByRole('heading', {
                name: 'Submissions',
            }),
        ).toBeInTheDocument()
    })

    it('shows an error when login fails', async () => {
        loginMock.mockRejectedValue(new Error('Invalid email or password.'))

        renderLogin()

        await submitValidCredentials()

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Invalid email or password.',
        )

        expect(
            screen.getByRole('heading', {
                name: 'Sign in',
            }),
        ).toBeInTheDocument()
    })

    it('does not navigate when login fails', async () => {
        loginMock.mockRejectedValue(new Error('Authentication failed.'))

        renderLogin({
            pathname: '/login',
            state: {
                from: {
                    pathname: '/grades',
                },
            },
        })

        await submitValidCredentials()

        await waitFor(() => {
            expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
        })
    })

    it('validates required fields before calling login', async () => {
        renderLogin()

        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(screen.getByText('Enter your email address.')).toBeInTheDocument()

        expect(screen.getByText('Enter your password.')).toBeInTheDocument()

        expect(loginMock).not.toHaveBeenCalled()
    })
})
