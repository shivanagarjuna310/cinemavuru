'use client'
// Read-only "Contest rules" opener, for use from server-rendered pages.
//
// The modal itself needs client state, and /contest and /contest/films are
// server components — this is the thin client boundary that lets them offer it
// without becoming client components themselves.

import { useState } from 'react'
import ContestRulesModal, { type RulesContest } from './ContestRulesModal'

export default function ContestRulesButton({
  contest,
  className,
  label = '📋 Contest rules',
}: {
  contest: RulesContest
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          'border border-[color:var(--border)] text-[color:var(--muted)] px-4 py-2 rounded-lg text-sm hover:text-[color:var(--accent)] hover:border-[color:var(--accent)]/40 transition'
        }
      >
        {label}
      </button>
      <ContestRulesModal contest={contest} mode="read" open={open} onClose={() => setOpen(false)} />
    </>
  )
}
