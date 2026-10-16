
import { createContext, useContext, useState } from 'react'

const FeedbackContext = createContext(null)

export function FeedbackProvider({ children }) {
    const [feedback, setFeedback] = useState(null)

    function showFeedback(type, message) {
        setFeedback({ type, message })
    }

    function clearFeedback() {
        setFeedback(null)
    }

    const styles = {
        success:
            'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
        error:
            'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
        info:
            'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100',
    }

    return (
        <FeedbackContext.Provider value={{ showFeedback, clearFeedback }}>
            {children}

            {feedback && (
                <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-center sm:justify-end">
                    <div
                        role={feedback.type === 'error' ? 'alert' : 'status'}
                        aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
                        className={`pointer-events-auto flex max-w-md items-start gap-4 rounded-xl border p-4 shadow-lg ${styles[feedback.type] ?? styles.info
                            }`}
                    >
                        <p className="flex-1 text-sm font-medium">
                            {feedback.message}
                        </p>

                        <button
                            type="button"
                            onClick={clearFeedback}
                            aria-label="Dismiss notification"
                            className="rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </FeedbackContext.Provider>
    )
}

export function useFeedback() {
    const context = useContext(FeedbackContext)

    if (!context) {
        throw new Error('useFeedback must be used inside FeedbackProvider')
    }

    return context
}
