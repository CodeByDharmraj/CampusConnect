
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

function createQueryClient() {
    return new QueryClient({
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
}

function renderPage(user, options = {}) {
    const queryClient = createQueryClient()

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

function administrator() {
    return {
        _id: 'admin-1',
        name: 'Test Administrator',
        role: 'admin',
    }
}

function faculty() {
    return {
        _id: 'faculty-1',
        name: 'Test Faculty',
        role: 'faculty',
    }
}

function coordinator() {
    return {
        _id: 'coordinator-1',
        name: 'Test Coordinator',
        role: 'coordinator',
        departmentId: 'department-123',
    }
}

function student() {
    return {
        _id: 'student-1',
        name: 'Test Student',
        role: 'student',
    }
}

async function waitForAnnouncement() {
    expect(
        await screen.findByText('Database assessment update'),
    ).toBeInTheDocument()
}

function fillAnnouncementForm(title, details) {
    fireEvent.change(screen.getByLabelText('Title'), {
        target: { value: title },
    })

    fireEvent.change(screen.getByLabelText('Details'), {
        target: { value: details },
    })
}

function submitAnnouncement() {
    fireEvent.click(
        screen.getByRole('button', {
            name: 'Publish announcement',
        }),
    )
}

function authorizationOptions() {
    return {
        headers: {
            Authorization: 'Bearer test-access-token',
        },
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
        renderPage(student())

        expect(
            await screen.findByRole('heading', {
                name: 'Announcements',
            }),
        ).toBeInTheDocument()

        await waitForAnnouncement()

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
        renderPage(student())

        const markReadButton = await screen.findByRole('button', {
            name: 'Mark as read',
        })

        fireEvent.click(markReadButton)

        await waitFor(() => {
            expect(apiClientMock.patch).toHaveBeenCalledWith(
                '/announcements/announcement-1/read',
                {},
                authorizationOptions(),
            )
        })
    })

    it('shows assigned course offerings to faculty', async () => {
        renderPage(faculty())

        expect(
            await screen.findByRole('heading', {
                name: 'Publish announcement',
            }),
        ).toBeInTheDocument()

        expect(
            await screen.findByRole('option', {
                name: /CSE301.*Database Management Systems/i,
            }),
        ).toBeInTheDocument()

        expect(
            screen.getByLabelText('Assigned course offering'),
        ).toBeInTheDocument()
    })

    it('publishes a course-scoped announcement as faculty', async () => {
        renderPage(faculty())

        await screen.findByRole('option', {
            name: /CSE301.*Database Management Systems/i,
        })

        fireEvent.change(screen.getByLabelText('Assigned course offering'), {
            target: {
                value: 'offering-1',
            },
        })

        fillAnnouncementForm(
            'Database assessment update',
            'Please review the upcoming database assessment.',
        )

        submitAnnouncement()

        await waitFor(() => {
            expect(apiClientMock.post).toHaveBeenCalledWith(
                '/announcements',
                {
                    title: 'Database assessment update',
                    detail: 'Please review the upcoming database assessment.',
                    category: 'Academic',
                    courseOfferingId: 'offering-1',
                },
                authorizationOptions(),
            )
        })

        expect(
            await screen.findByText('Announcement published successfully.'),
        ).toBeInTheDocument()
    })

    it('publishes a department announcement as a coordinator', async () => {
        renderPage(coordinator())

        await waitForAnnouncement()

        fillAnnouncementForm(
            'Department meeting update',
            'The department meeting will take place tomorrow.',
        )

        submitAnnouncement()

        await waitFor(() => {
            expect(apiClientMock.post).toHaveBeenCalledWith(
                '/announcements',
                {
                    title: 'Department meeting update',
                    detail: 'The department meeting will take place tomorrow.',
                    category: 'Academic',
                },
                authorizationOptions(),
            )
        })
    })

    it('publishes an institution-wide announcement as an administrator', async () => {
        renderPage(administrator())

        await waitForAnnouncement()

        fillAnnouncementForm(
            'Campus-wide update',
            'Important information for the entire institution.',
        )

        submitAnnouncement()

        await waitFor(() => {
            expect(apiClientMock.post).toHaveBeenCalledWith(
                '/announcements',
                {
                    title: 'Campus-wide update',
                    detail: 'Important information for the entire institution.',
                    category: 'Academic',
                },
                authorizationOptions(),
            )
        })
    })

    it('validates announcement title length', async () => {
        renderPage(administrator())

        await waitForAnnouncement()

        fillAnnouncementForm(
            'Hi',
            'This is a valid announcement detail.',
        )

        submitAnnouncement()

        expect(
            screen.getAllByText('Title must contain at least 5 characters.'),
        ).toHaveLength(2)

        expect(apiClientMock.post).not.toHaveBeenCalled()
    })

    it('validates announcement details length', async () => {
        renderPage(administrator())

        await waitForAnnouncement()

        fillAnnouncementForm(
            'Valid announcement title',
            'Short',
        )

        submitAnnouncement()

        expect(
            screen.getAllByText('Details must contain at least 10 characters.'),
        ).toHaveLength(2)

        expect(apiClientMock.post).not.toHaveBeenCalled()
    })

    it('requires faculty to select an assigned course offering', async () => {
        renderPage(faculty())

        await screen.findByRole('option', {
            name: /CSE301.*Database Management Systems/i,
        })

        fillAnnouncementForm(
            'Course announcement',
            'Please read this course announcement.',
        )

        const publishButton = screen.getByRole('button', {
            name: 'Publish announcement',
        })

        // Faculty cannot publish until an assigned course is selected.
        expect(publishButton).toBeDisabled()

        expect(apiClientMock.post).not.toHaveBeenCalled()
    })

    it('does not expose publishing controls to students', async () => {
        renderPage(student())

        await waitForAnnouncement()

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

        await waitForAnnouncement()

        expect(
            screen.queryByRole('button', {
                name: 'Publish announcement',
            }),
        ).not.toBeInTheDocument()
    })

    it('displays an error when announcements cannot be loaded', async () => {
        useAuthMock.mockReturnValue({
            user: student(),
            accessToken: 'test-access-token',
        })

        apiClientMock.get.mockRejectedValue(
            new Error('Network unavailable'),
        )

        const queryClient = createQueryClient()

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
        renderPage(administrator())

        await waitForAnnouncement()

        // Override the default successful POST mock after renderPage().
        apiClientMock.post.mockRejectedValueOnce({
            response: {
                data: {
                    message: 'You are not authorized to publish this announcement.',
                },
            },
        })

        fillAnnouncementForm(
            'Valid announcement title',
            'This is a valid announcement description.',
        )

        submitAnnouncement()

        expect(
            await screen.findAllByText(
                'You are not authorized to publish this announcement.',
            ),
        ).toHaveLength(2)
    })
})
