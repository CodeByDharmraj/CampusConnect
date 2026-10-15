
export default function Navbar({
    role,
    onRoleChange,
    onMenuOpen,
    theme,
    onThemeToggle,
}) {
    return (
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Open navigation menu"
                        aria-controls="mobile-navigation"
                        onClick={onMenuOpen}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-2 hover:bg-[var(--color-elevated)] lg:hidden"
                    >
                        ☰
                    </button>

                    <div>
                        <p className="font-bold text-blue-700 dark:text-blue-300 lg:hidden">
                            CampusConnect
                        </p>
                        <p className="hidden text-sm font-medium sm:block">
                            Academic information, in one place
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <label className="sr-only" htmlFor="demo-role">
                        Preview role
                    </label>
                    <select
                        id="demo-role"
                        value={role}
                        onChange={(event) => onRoleChange(event.target.value)}
                        className="max-w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm sm:max-w-none sm:px-3"
                    >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                    </select>

                    <button
                        type="button"
                        onClick={onThemeToggle}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-elevated)]"
                    >
                        {theme === 'light' ? '☾' : '☀'}
                        <span className="sr-only">
                            {theme === 'light' ? 'Dark mode' : 'Light mode'}
                        </span>
                    </button>

                    <div
                        className="hidden h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 sm:flex"
                        aria-label="Demo profile"
                    >
                        CC
                    </div>
                </div>
            </div>
        </header>
    )
}
