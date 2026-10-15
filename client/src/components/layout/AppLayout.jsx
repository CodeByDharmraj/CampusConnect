
import { useEffect, useState } from 'react'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'
import MobileDrawer from './MobileDrawer.jsx'

import { Outlet } from 'react-router'

export default function AppLayout({ children }) {
    const [role, setRole] = useState('student')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [theme, setTheme] = useState('light')

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
    }, [theme])

    useEffect(() => {
        function closeOnEscape(event) {
            if (event.key === 'Escape') {
                setDrawerOpen(false)
            }
        }

        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [])

    function toggleTheme() {
        setTheme((current) => current === 'light' ? 'dark' : 'light')
    }

    return (
        <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)]">
            <div className="flex min-h-screen">
                <Sidebar
                    role={role}
                    onNavigate={() => setDrawerOpen(false)}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <Navbar
                        role={role}
                        onRoleChange={setRole}
                        onMenuOpen={() => setDrawerOpen(true)}
                        theme={theme}
                        onThemeToggle={toggleTheme}
                    />

                    <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
                        <div className="mx-auto w-full max-w-7xl">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>

            <MobileDrawer
                role={role}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    )
}
