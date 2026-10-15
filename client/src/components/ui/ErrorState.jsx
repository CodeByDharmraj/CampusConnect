
export default function ErrorState({
    title = 'Something went wrong',
    description = 'Please try again.',
    onRetry,
}) {
    return (
        <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
        >
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm">{description}</p>

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 rounded-lg border border-current px-3 py-2 text-sm font-semibold"
                >
                    Try again
                </button>
            )}
        </div>
    )
}
