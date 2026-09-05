'use client'
// Live countdown to the moment the contest opens.
//
// Ticks every second, because at this size the seconds column is the thing that
// makes it feel like a real deadline rather than a static label.
//
// Renders nothing until mounted: the server and the client would compute
// different remaining times and React would flag a hydration mismatch.

import { useEffect, useState } from 'react'

type Parts = { d: number; h: number; m: number; s: number }

function remaining(target: number): Parts | null {
  const ms = target - Date.now()
  if (ms <= 0) return null
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  }
}

export default function ContestCountdown({
  openAt,
  compact = false,
  label = 'Entries open in',
  endedLabel = 'Entries are opening now…',
}: {
  openAt: string
  compact?: boolean
  /** Reused for any deadline — entries opening, entries closing, voting ending. */
  label?: string
  endedLabel?: string
}) {
  const target = new Date(openAt).getTime()
  const [left, setLeft] = useState<Parts | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (Number.isNaN(target)) return
    const tick = () => { setLeft(remaining(target)); setReady(true) }
    // Deferred rather than called inline: setting state synchronously in an
    // effect body causes a cascading render (react-hooks/set-state-in-effect).
    // A 0ms timeout runs on the next macrotask, which is imperceptible.
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [target])

  if (!ready || Number.isNaN(target)) return null

  // Past the deadline the page itself flips to the live contest on its next
  // revalidation; until then say something true rather than showing zeros.
  if (!left) {
    return (
      <p className={`text-[color:var(--accent)] font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
        {endedLabel}
      </p>
    )
  }

  const cells: [number, string][] = [
    [left.d, 'Days'],
    [left.h, 'Hrs'],
    [left.m, 'Min'],
    [left.s, 'Sec'],
  ]

  const compactPrefix = label === 'Entries open in' ? 'Starts in' : label.replace(/ in$/, '') + ' in'

  if (compact) {
    return (
      <span className="text-[color:var(--muted)] text-xs tabular-nums">
        {compactPrefix}{' '}
        <span className="text-[color:var(--accent)] font-bold">
          {left.d}d {String(left.h).padStart(2, '0')}h {String(left.m).padStart(2, '0')}m
        </span>
      </span>
    )
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--muted)] text-center mb-2.5">
        {label}
      </p>
      <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
        {cells.map(([v, label]) => (
          <div
            key={label}
            className="rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] py-2.5 text-center"
          >
            <div className="text-xl sm:text-2xl font-black tabular-nums leading-none text-[color:var(--accent)]">
              {String(v).padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[color:var(--muted)] mt-1">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
