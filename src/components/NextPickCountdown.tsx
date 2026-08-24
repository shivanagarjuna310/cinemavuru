'use client'
// Live "next pick in 6h 12m" ticker for Film of the Day.
//
// Split out as the only client component in the feature so the card itself
// stays a server component (no extra JS for the poster, title, or links).
// Ticks once a minute — a per-second countdown would re-render 60x more for
// no visible benefit at this granularity.

import { useEffect, useState } from 'react'
import { msUntilNextPick, formatCountdown } from '@/lib/filmOfTheDay'

export default function NextPickCountdown() {
  // null until mounted: the server and the client would otherwise render
  // different strings and React would report a hydration mismatch.
  const [left, setLeft] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setLeft(formatCountdown(msUntilNextPick()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!left) return null

  return (
    <span className="text-[color:var(--muted)] text-xs">
      New pick in <span className="text-[color:var(--accent)] font-semibold">{left}</span>
    </span>
  )
}
