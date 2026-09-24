'use client'
// Route-level error boundary — catches render/data errors in a segment and
// shows a friendly, on-brand fallback instead of a broken page.

import Link from 'next/link'
import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    // Also persist it. This boundary used to only log to the console, so a
    // crash a user hit on their phone left nothing behind — error_logs held no
    // error-level rows at all while this page was being shown in production.
    // The URL and digest are what make one of these reproducible afterwards.
    logger.error('ErrorBoundary', 'render', error.message || 'Unhandled render error', error, {
      digest: error.digest,
      url: typeof window !== 'undefined' ? window.location.pathname : null,
      stack: error.stack?.slice(0, 800),
    }).catch(() => { /* never let reporting break the fallback UI */ })
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="text-6xl">🎬</div>
      <h1 className="text-2xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
        Something went wrong
      </h1>
      <p className="text-[color:var(--muted)] max-w-sm leading-relaxed">
        We hit a snag loading this page. Give it another try — if it keeps happening, head back home.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={reset}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm hover:opacity-90 transition">
          Try again
        </button>
        <Link href="/"
          className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm hover:bg-[#D4A017]/10 transition">
          Back home
        </Link>
      </div>
    </div>
  )
}
