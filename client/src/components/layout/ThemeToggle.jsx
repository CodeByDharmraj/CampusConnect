import { Moon, Sun } from 'lucide-react'

// Presentational only: the theme state lives in useTheme (called by AppLayout).
export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span>{isDark ? 'Dark appearance' : 'Light appearance'}</span>
      <span aria-hidden="true">
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </span>
    </button>
  )
}
