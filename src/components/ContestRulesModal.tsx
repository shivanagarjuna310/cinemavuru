'use client'
// The full contest rules, in a modal.
//
// DATA-DRIVEN ON PURPOSE: every number and date comes from the contest row —
// fee, prizes, the vote threshold, both windows. Hardcoding them is how rules
// drift from reality (the first prize moved 10,000 -> 9,999 for TDS, and a
// hardcoded copy would still be advertising the old figure). If you change a
// prize in the admin panel, this modal changes with it.
//
// Two modes:
//   mode="read"        → informational, single Close button
//   mode="acknowledge" → requires ticking both declarations before continuing,
//                        used as a gate before payment
//
// The acknowledge mode exists because two rules are otherwise unenforceable:
// that the entrant contributed to the film, and that the fee is
// non-refundable. Neither can be checked by the build, so the best available
// control is an explicit, timestamped claim by the entrant at the moment of
// entry.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type RulesContest = {
  entry_fee: number | null
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  min_votes: number | null
  season_number: number | null
  submissions_open_at: string | null
  submissions_close_at: string | null
  voting_close_at: string | null
}

const inr = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`

/** Dates are printed in IST — the audience is in India and the deadlines are IST. */
function day(iso: string | null): string {
  if (!iso) return 'to be announced'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'to be announced'
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ContestRulesModal({
  contest,
  mode = 'read',
  open,
  onClose,
  onAccept,
}: {
  contest: RulesContest
  mode?: 'read' | 'acknowledge'
  open: boolean
  onClose: () => void
  onAccept?: () => void
}) {
  const [ownWork, setOwnWork] = useState(false)
  const [agreed, setAgreed] = useState(false)
  // Portalled to document.body. The pages that host this render their content
  // inside `<main className="relative z-10">`, and `relative` + a z-index
  // creates a STACKING CONTEXT — so a z-index here, however large, is scoped
  // inside that z-10 and can never rise above the navbar's z-50 sibling. The
  // navbar was drawing over the modal header. A portal escapes the context.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const pool = contest.prize_1st + contest.prize_2nd + contest.prize_3rd
  const threshold = contest.min_votes ?? 0

  const Section = ({ title, items }: { title: string; items: React.ReactNode[] }) => (
    <section className="mb-5">
      <h3 className="text-[color:var(--accent)] font-bold text-sm uppercase tracking-wide mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[color:var(--muted)] text-[13px] leading-relaxed flex gap-2">
            <span className="text-[color:var(--faint)] shrink-0">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  )

  const b = (t: string) => <b className="text-[color:var(--text)]">{t}</b>

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contest-rules-title"
    >
      <button aria-label="Close" onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]" />

      <div className="relative w-full sm:max-w-2xl bg-[color:var(--surface)] border border-[color:var(--accent)]/30 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header stays put while the rules scroll. */}
        <div className="shrink-0 flex items-start justify-between gap-3 p-5 sm:p-6 pb-3 border-b border-[color:var(--border)]">
          <div>
            <h2 id="contest-rules-title"
              className="text-lg sm:text-xl font-black text-[color:var(--text)]"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              Contest Rules — Season {contest.season_number ?? 1}
            </h2>
            <p className="text-[color:var(--muted)] text-xs mt-0.5">
              {inr(pool)} prize pool · {inr(contest.entry_fee)} to enter
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="shrink-0 w-8 h-8 grid place-items-center rounded-full text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg)] transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6 pt-4">
          <Section title="Entry" items={[
            <>Entry fee {b(inr(contest.entry_fee))} per entry.</>,
            <>Open to any registered CinemaVuru user, from any district.</>,
            <>Submissions: {b(day(contest.submissions_open_at))} to {b(day(contest.submissions_close_at))}.</>,
            <>Telugu language. No length limit — films are hosted on YouTube.</>,
            <>Any film is eligible, including older releases. It need not be made for this contest.</>,
            <>{b('It must be your own work.')} You must have genuinely contributed to the film — as
              director, writer, producer, cinematographer, editor, cast or another credited role. You may
              not enter a film you had no part in making. Random or anonymous films taken from elsewhere
              are not eligible, and entering one means disqualification with no refund.</>,
            <>If authorship is unclear we may ask for the original file, raw footage, cast and crew
              details, or proof that you own the YouTube channel. Entries we cannot verify are rejected.</>,
            <>{b('One entry per account')} for the season.</>,
            <>Your entry goes live only after an admin verifies payment and approves it — usually within
              24 hours. Only approved, paid entries appear on the leaderboard and can collect votes.</>,
            <>The entry fee is {b('non-refundable')}, except where your film is not approved.</>,
          ]} />

          <Section title="Voting" items={[
            <>Voting runs until {b(day(contest.voting_close_at))}, starting as soon as submissions close.</>,
            <>{b('One vote per registered user for the whole season')} — not per film. You may vote for any
              film, including your own.</>,
            <>You can change or withdraw your vote any time until voting closes. Moving it to another film
              removes it from the first.</>,
            <>Only registered users can vote. Votes are tied to your account, not your device.</>,
          ]} />

          <Section title="Scoring" items={[
            <>Winners are decided by public vote — films are ranked by total votes; the highest wins.</>,
            threshold > 0
              ? <>{b(`${threshold} votes`)} unlocks the full prize pool. Getting your film in front of
                  people is part of the contest — share it, and get your audience to register and vote.</>
              : <>Films are ranked purely by votes received.</>,
            <>Likes and views do {b('not')} count toward the result. Only votes decide placement.</>,
            <>Engagement shown on the leaderboard counts only what a film earned after it entered, so an
              older film gets no head start over a newer one.</>,
          ]} />

          <Section title="Prizes" items={[
            <>🥇 {b(inr(contest.prize_1st))} · 🥈 {b(inr(contest.prize_2nd))} · 🥉 {b(inr(contest.prize_3rd))}
              — {inr(pool)} total.</>,
            <>Winners are permanently featured on the CinemaVuru Hall of Fame, credited to this season,
              with their final vote count shown.</>,
          ]} />

          <Section title="Fair play" items={[
            <>Vote manipulation — bots, purchased votes or fake accounts — may result in disqualification
              at CinemaVuru&apos;s discretion. Voting patterns are reviewed before results are finalised.</>,
            <>{b('Entering someone else’s film as your own')} is the most serious breach: the entry is
              disqualified, the fee is not refunded, and the account may be barred from future seasons.</>,
            <>We may remove any entry that violates copyright, contains inappropriate content, or
              misrepresents authorship.</>,
            <>These rules are final once submissions open and will not change mid-season.</>,
          ]} />

          {mode === 'acknowledge' && (
            <div className="mt-2 rounded-xl border border-[color:var(--accent)]/35 bg-[color:var(--bg)] p-4 space-y-3">
              <label className="flex gap-3 items-start cursor-pointer">
                <input type="checkbox" checked={ownWork} onChange={e => setOwnWork(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#D4A017]" />
                <span className="text-[13px] text-[color:var(--text)] leading-relaxed">
                  I contributed to this film and have the right to enter it.
                </span>
              </label>
              <label className="flex gap-3 items-start cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#D4A017]" />
                <span className="text-[13px] text-[color:var(--text)] leading-relaxed">
                  I have read and agree to the rules above, including that the {inr(contest.entry_fee)} fee
                  is non-refundable once my entry is approved.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer stays visible so the action is always reachable. */}
        <div className="shrink-0 p-5 sm:p-6 pt-3 border-t border-[color:var(--border)]">
          {mode === 'acknowledge' ? (
            <button
              onClick={() => { onAccept?.(); onClose() }}
              disabled={!ownWork || !agreed}
              className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {!ownWork || !agreed ? 'Tick both boxes to continue' : 'I acknowledge — continue'}
            </button>
          ) : (
            <button onClick={onClose}
              className="w-full border border-[color:var(--border)] text-[color:var(--text)] py-3 rounded-xl font-bold uppercase tracking-wide text-[13px] hover:border-[color:var(--accent)]/50 transition">
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
