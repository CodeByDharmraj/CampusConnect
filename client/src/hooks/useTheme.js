import { useEffect, useState } from 'react'

// Dark/light appearance. The <html> element's "dark" class is the single
// source the whole stylesheet reacts to, so this hook is the only place that
// writes it.
//
// Call this ONCE (in AppLayout) and pass isDark/toggleTheme down. The desktop
// sidebar and the mobile drawer each render a toggle button; if each button
// owned its own copy of this state, the two could drift out of sync.
export function useTheme() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggleTheme = () => setIsDark((current) => !current)

  return { isDark, toggleTheme }
}
