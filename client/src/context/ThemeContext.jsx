
import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react'

const ThemeContext = createContext(null)

function getInitialTheme() {
    try {
        const savedTheme = localStorage.getItem('campusconnect-theme')

        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme
        }
    } catch {
        // Continue with the default if storage is unavailable.
    }

    return 'light'
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        const root = document.documentElement

        root.classList.toggle('dark', theme === 'dark')
        root.style.colorScheme = theme

        try {
            localStorage.setItem('campusconnect-theme', theme)
        } catch {
            // The theme still works for this session if storage is unavailable.
        }
    }, [theme])

    function toggleTheme() {
        setTheme((current) => current === 'light' ? 'dark' : 'light')
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider')
    }

    return context
}
