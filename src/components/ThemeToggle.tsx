'use client'
// src/components/ThemeToggle.tsx — dark/light switch.
// Default theme is DARK; the choice persists in localStorage.
// A blocking script in layout.tsx applies the class before paint (no flash).

import { useEffect, useState } from 'react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [light, setLight] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLight(document.documentElement.classList.contains('light'))
    setMounted(true)
  }, [])

  function toggle() {
    const next = !light
    setLight(next)
    const root = document.documentElement
    root.classList.toggle('light', next)
    try { localStorage.setItem('theme', next ? 'light' : 'dark') } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      title={light ? 'Switch to dark theme' : 'Switch to light theme'}
      className={`text-[color:var(--muted)] hover:text-[color:var(--accent)] transition p-2 rounded hover:bg-[#D4A017]/10 ${className}`}
    >
      {/* Avoid hydration mismatch: render a neutral icon until mounted */}
      {mounted && light ? (
        /* Moon — click to go dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        /* Sun — click to go light */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
