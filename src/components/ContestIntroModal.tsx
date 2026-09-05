'use client'
// Landing popup announcing the contest — the first thing a new visitor sees.
//
// WHO SEES IT: every visitor, once per contest per browser.
//
// It used to be logged-out only, back when the whole message was "register".
// Now that it announces a dated event, signed-in users need it just as much —
// they are the people most likely to actually enter, and they would otherwise
// never learn the start date. The CTA is auth-aware instead: registration for
// visitors, a plain acknowledgement for members.
//
// WHY: 2,233 of 2,598 unique visitors came exactly once and never returned.
// Most arrive from a WhatsApp link, watch one film and leave without ever
// learning there is prize money. The strip alone is easy to scroll past, so the
// prize gets one deliberate, dismissible interruption on arrival.
//
// SCOPE: the competition has NOT started. This announces the date and the prize
// money and nothing else — no entry steps, no voting rules, no fee.
//
// Deliberately restrained: fires once, remembers the dismissal forever (keyed
// by contest id so a new season can ask again), and never blocks the page.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { Podium, startBadge, type ComingSoonContest } from './ContestComingSoon'
import ContestCountdown from './ContestCountdown'

const SEEN_PREFIX = 'cv_contest_intro_'
// Let the page paint and settle first — an instant modal reads as an ad.
const DELAY_MS = 1200

export default function ContestIntroModal({
  contest,
  contestId,
}: {
  contest: ComingSoonContest
  contestId: string
}) {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const key = `${SEEN_PREFIX}${contestId}`

  const dismiss = useCallback(() => {
    setOpen(false)
    try { localStorage.setItem(key, String(Date.now())) } catch { /* private mode */ }
  }, [key])

  useEffect(() => {
    // Wait for auth only so the CTA is right on first paint — not to exclude
    // signed-in users, who now see this too.
    if (loading) return
    let seen = false
    try { seen = Boolean(localStorage.getItem(key)) } catch { seen = false }
    if (seen) return
    const t = setTimeout(() => setOpen(true), DELAY_MS)
    return () => clearTimeout(t)
  }, [loading, key])

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, dismiss])

  if (!open) return null

  const pool = contest.prize_1st + contest.prize_2nd + contest.prize_3rd
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
  const startLine = contest.submissions_open_at
    ? `It begins ${new Date(contest.submissions_open_at).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long',
      })}`
    : 'It is on its way'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contest-intro-title"
    >
      {/* Backdrop — click anywhere to dismiss */}
      <button
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
      />

      {/* Sheet on mobile, centred card on desktop */}
      <div className="relative w-full sm:max-w-lg bg-[color:var(--surface)] border border-[color:var(--accent)]/30 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg)] transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5 sm:p-7 pt-6">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded">
              {startBadge(contest.submissions_open_at)}
            </span>
            <span className="text-[color:var(--muted)] text-xs">
              Season {contest.season_number ?? 1}
            </span>
          </div>

          <h2
            id="contest-intro-title"
            className="text-2xl sm:text-3xl font-black text-[color:var(--text)] leading-[1.12]"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            A {inr(pool)} short film competition
          </h2>

          <p
            className="mt-2 text-[color:var(--accent)] text-sm"
            style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
          >
            మీ షార్ట్ ఫిల్మ్‌కి బహుమతులు — త్వరలో
          </p>

          <p className="mt-2.5 text-[color:var(--muted)] text-sm leading-relaxed">
            {startLine}, with
            <b className="text-[color:var(--text)]"> {inr(contest.prize_1st)} for first place</b>.
            Full details announced soon.
          </p>

          {contest.submissions_open_at && (
            <div className="mt-5">
              <ContestCountdown openAt={contest.submissions_open_at} />
            </div>
          )}

          <div className="mt-5">
            <Podium c={contest} dense />
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {user ? (
              // Already a member — nothing to sign up for, so just let them go.
              <button
                onClick={dismiss}
                className="w-full text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] hover:opacity-90 transition"
              >
                Got it — I&apos;ll be ready
              </button>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={dismiss}
                  className="w-full text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] hover:opacity-90 transition"
                >
                  Create your free account
                </Link>
                <button
                  onClick={dismiss}
                  className="text-[color:var(--muted)] text-xs hover:text-[color:var(--text)] transition py-1"
                >
                  Maybe later
                </button>
              </>
            )}
          </div>

          <p className="text-[color:var(--faint)] text-[11px] text-center mt-3 leading-relaxed">
            Watching and publishing on CinemaVuru is always free.
          </p>
        </div>
      </div>
    </div>
  )
}
