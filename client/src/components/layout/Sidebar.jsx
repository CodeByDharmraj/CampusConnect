
import { NavLink } from 'react-router'
import { navigationByRole } from '../../config/navigation.js'

export default function Sidebar({ role, onNavigate }) {
    const items = navigationByRole[role] ?? navigationByRole.student

    return (
        <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex lg:flex-col">
            <div className="border-b border-[var(--color-border)] px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                    CU Jammu
                </p>
                <p className="mt-1 text-sm font-medium">Campus portal</p>
            </div>

            <nav aria-label="Main navigation" className="flex-1 space-y-1 p-3">
                {items.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onNavigate}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)]"
                    >
                        <span aria-hidden="true" className="w-5 text-center text-base">
                            {item.icon}
                        </span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-[var(--color-border)] p-4">
                <p className="text-xs text-[var(--color-muted)]">
                    CampusConnect · MVP
                </p>
            </div>
        </aside>
    )
}
