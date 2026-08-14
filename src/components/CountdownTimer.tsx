'use client'
// Live ticking countdown to a contest deadline. Renders nothing until mounted
// (avoids hydration mismatch) and shows "Ended" once the target passes.

import { useEffect, useState } from 'react'

export default function CountdownTimer({ target, label }: { target: string | null; label?: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()
    const tick = () => setRemaining(end - Date.now())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [target])

  if (!target || remaining === null) return null

  if (remaining <= 0) {
    return (
      <div>
        {label && <div className="text-xs text-[color:var(--muted)] uppercase tracking-widest mb-2">{label}</div>}
        <span className="text-[color:var(--muted)] font-semibold">Ended</span>
      </div>
    )
  }

  const blocks = [
    { v: Math.floor(remaining / 86400000), l: 'days' },
    { v: Math.floor(remaining / 3600000) % 24, l: 'hrs' },
    { v: Math.floor(remaining / 60000) % 60, l: 'min' },
    { v: Math.floor(remaining / 1000) % 60, l: 'sec' },
  ]

  return (
    <div>
      {label && <div className="text-xs text-[color:var(--muted)] uppercase tracking-widest mb-2">{label}</div>}
      <div className="flex gap-2">
        {blocks.map(b => (
          <div key={b.l} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-center min-w-[54px]">
            <div className="text-xl font-black text-[color:var(--accent)] tabular-nums leading-none">{String(b.v).padStart(2, '0')}</div>
            <div className="text-[9px] text-[color:var(--muted)] uppercase tracking-wide mt-1">{b.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
