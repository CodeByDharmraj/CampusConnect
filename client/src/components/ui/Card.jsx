
export default function Card({ children, className = '' }) {
    return (
        <section
            className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm ${className}`}
        >
            {children}
        </section>
    )
}
