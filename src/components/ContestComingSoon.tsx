// Coming-soon competition teaser. Server component — no client JS.
//
// SCOPE, deliberately narrow: the competition has NOT started, so nothing here
// explains how to enter, how winners are chosen, or what the entry fee is.
// Announcing mechanics for something that isn't open yet just creates questions
// we can't answer. This says one thing — there is prize money coming — and asks
// for a free account so the visitor is on the platform when it launches.
//
// The CTA registers the user to CinemaVuru, NOT to the competition. There is no
// entry to sign up for yet, and implying otherwise would be a false promise.
//
// THEMING RULE (learned the hard way): never hardcode a neutral colour here.
// An earlier version used `from-[#1A1208]`, which is the *dark* theme's
// --surface value, so in light mode it painted a dark blob underneath dark text
// and the headline became unreadable. Neutrals must come from CSS variables so
// they flip with the theme. Only brand fills (--gold / --saffron) are safe to
// use literally, because they are identical in both themes by design.

import Link from 'next/link'
import ContestTeaserCta from './ContestTeaserCta'
import ContestCountdown from './ContestCountdown'

export type ComingSoonContest = {
  title: string
  season_number?: number | null
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  submissions_open_at?: string | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/**
 * Badge text. Derived from the date rather than hardcoded, so moving the start
 * in the admin panel updates every surface at once and none of them can go
 * stale. Formatted in IST — 2026-09-07T18:30Z is "Sep 8" for this audience,
 * and formatting in UTC would print the 7th.
 */
export function startBadge(iso?: string | null): string {
  if (!iso) return 'Coming Soon'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Coming Soon'
  if (d.getTime() <= Date.now()) return 'Live Now'
  // en-US, not en-IN: en-IN renders "8 Sept", which reads awkwardly in a badge.
  // The timeZone is what actually matters here and is set explicitly.
  const day = d.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })
  return `Starts ${day}`
}

/** Teasing, not instructional — no dates means no promises. */
export function timingLine(iso?: string | null): string {
  if (!iso) return 'Announcing soon'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Announcing soon'
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days > 1) return `Starts in ${days} days`
  if (days === 1) return 'Starts tomorrow'
  if (days === 0) return 'Starts today'
  return 'Starting now'
}

/**
 * 1st / 2nd / 3rd prize cards — the whole point of the teaser.
 *
 * `min-w-0` + `tabular-nums` + a clamped font size are load-bearing: at the
 * previous size "₹10,000" overflowed its card and got visually clipped on
 * narrow columns. Numerals never wrap now, and the card shrinks instead.
 */
export function Podium({ c, dense = false }: { c: ComingSoonContest; dense?: boolean }) {
  const places = [
    { n: '2', label: '2nd', amount: c.prize_2nd, ring: 'ring-[color:var(--border)]', accent: 'text-[color:var(--text)]', lift: 'sm:mt-4' },
    { n: '1', label: '1st', amount: c.prize_1st, ring: 'ring-[color:var(--accent)]/55', accent: 'text-[color:var(--accent)]', lift: '' },
    { n: '3', label: '3rd', amount: c.prize_3rd, ring: 'ring-[color:var(--border)]', accent: 'text-[color:var(--text)]', lift: 'sm:mt-6' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end">
      {places.map(p => (
        <div
          key={p.label}
          className={`${p.lift} min-w-0 rounded-xl bg-[color:var(--bg)] ring-1 ${p.ring} px-1.5 py-3 sm:px-3 sm:py-4 text-center`}
        >
          <div
            className={`mx-auto mb-1.5 grid place-items-center rounded-full text-[10px] font-black
              ${p.label === '1st'
                ? 'w-5 h-5 text-black bg-gradient-to-br from-[#FF6B1A] to-[#D4A017]'
                : 'w-[18px] h-[18px] text-[color:var(--muted)] ring-1 ring-[color:var(--border)]'}`}
            aria-hidden
          >
            {p.n}
          </div>
          <div
            className={`font-black leading-none tabular-nums whitespace-nowrap ${p.accent} ${
              dense
                ? 'text-[13px] sm:text-base'
                : p.label === '1st'
                  ? 'text-base sm:text-xl md:text-2xl'
                  : 'text-sm sm:text-lg md:text-xl'
            }`}
          >
            {inr(p.amount)}
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[color:var(--muted)] mt-1 truncate">
            {p.label} prize
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ContestComingSoon({
  contest,
  compact = false,
}: {
  contest: ComingSoonContest
  compact?: boolean
}) {
  const pool = contest.prize_1st + contest.prize_2nd + contest.prize_3rd
  const timing = timingLine(contest.submissions_open_at)

  // ── Compact strip (homepage / upload page) ──────────────────────────────
  // Stacks vertically on mobile so the podium gets full width instead of being
  // squeezed into a side column.
  if (compact) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        <Link
          href="/contest"
          className="group block rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--surface)] p-4 sm:p-5 hover:border-[color:var(--accent)]/60 transition-colors"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded whitespace-nowrap">
                  {startBadge(contest.submissions_open_at)}
                </span>
                {contest.submissions_open_at
                  ? <ContestCountdown openAt={contest.submissions_open_at} compact />
                  : <span className="text-[color:var(--muted)] text-xs">{timing}</span>}
              </div>

              <h3
                className="text-lg sm:text-xl md:text-2xl font-black text-[color:var(--text)] leading-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                A {inr(pool)} short film competition
              </h3>

              <p className="text-[color:var(--muted)] text-xs sm:text-sm mt-1.5">
                Season {contest.season_number ?? 1} · {inr(contest.prize_1st)} for first place
              </p>

              <span className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--accent)]">
                See what&apos;s coming
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </div>

            <div className="w-full md:w-[320px] md:shrink-0">
              <Podium c={contest} />
            </div>
          </div>
        </Link>
      </section>
    )
  }

  // ── Full teaser (/contest while upcoming) ──────────────────────────────
  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-black/70 animate-pulse" aria-hidden />
          {startBadge(contest.submissions_open_at)}
        </span>

        <h1
          className="mt-6 text-3xl sm:text-5xl font-black text-[color:var(--text)] leading-[1.06] tabular-nums"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {inr(pool)} in prizes
        </h1>

        <p
          className="mt-3 text-[color:var(--accent)] text-sm sm:text-base"
          style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
        >
          మీ షార్ట్ ఫిల్మ్‌కి బహుమతులు — త్వరలో
        </p>

        <p className="mt-3 text-[color:var(--muted)] text-sm sm:text-base">
          CinemaVuru Season {contest.season_number ?? 1}
          {!contest.submissions_open_at && <> · {timing}</>}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-7">
        {contest.submissions_open_at && (
          <div className="mb-6">
            <ContestCountdown openAt={contest.submissions_open_at} />
          </div>
        )}

        <Podium c={contest} />

        {/* Auth-aware: signed-in users must not be told to make an account. */}
        <ContestTeaserCta />
      </div>
    </section>
  )
}
