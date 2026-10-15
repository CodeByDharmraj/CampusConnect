
import { navigationByRole } from '../../config/navigation.js'

export default function MobileDrawer({ role, open, onClose }) {
    if (!open) return null

    const items = navigationByRole[role] ?? navigationByRole.student

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-slate-950/50"
                onClick={onClose}
            />

            <aside
                id="mobile-navigation"
                aria-label="Mobile navigation"
                className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            >
                <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
                    <div>
                        <p className="font-bold text-blue-700 dark:text-blue-300">
                            CampusConnect
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                            CU Jammu · Demo branding
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="rounded-lg px-3 py-2 hover:bg-[var(--color-elevated)]"
                    >
                        ✕
                    </button>
                </div>

                <nav aria-label="Mobile main navigation" className="flex-1 space-y-1 p-3">
                    {items.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium hover:bg-[var(--color-elevated)]"
                        >
                            <span aria-hidden="true" className="w-5 text-center">
                                {item.icon}
                            </span>
                            {item.label}
                        </a>
                    ))}
                </nav>
            </aside>
        </div>
    )
}
