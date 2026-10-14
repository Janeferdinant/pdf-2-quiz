import { useEffect, useState } from 'react'

// Remembers only the light/dark choice in localStorage. The API key is never stored here.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null)

  // Read the saved theme after mount, so the server-rendered HTML and the first client render match.
  useEffect(() => {
    let saved = null
    try {
      saved = window.localStorage.getItem('theme')
    } catch {
      // storage blocked: fall back to light
    }
    setTheme(saved === 'dark' ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    if (!theme) return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem('theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
