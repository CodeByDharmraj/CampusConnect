
const statusStyles = {
    Unread: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    Read: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    Approved: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

export default function StatusBadge({ status }) {
    const styles = statusStyles[status] ??
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
        >
            {status}
        </span>
    )
}
