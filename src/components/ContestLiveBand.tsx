// Live contest band for the homepage. Server component — the only client JS is
// the countdown.
//
// WHY: the homepage advertised an *upcoming* season but went completely silent
// once one actually started. A visitor during submissions or voting saw no sign
// there was a live competition, no deadline, and no way in — the two phases
// with the most at stake were the two the homepage never mentioned.
//
// Everything here is a reason to act now: the phase, the money, how many films
// are already in, how many votes are cast, and a ticking deadline.

import Link from 'next/link'
import ContestCountdown from './ContestCountdown'

export type LiveContest = {
  id: string
  title: string
  status: string
  season_number: number | null
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  entry_fee: number | null
  submissions_close_at: string | null
  voting_close_at: string | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function ContestLiveBand({
  contest,
  entryCount,
  voteCount,
}: {
  contest: LiveContest
  entryCount: number
  voteCount: number
}) {
  const isVoting = contest.status === 'voting'
  const isOpen = contest.status === 'open'
  if (!isVoting && !isOpen) return null

  const pool = contest.prize_1st + contest.prize_2nd + contest.prize_3rd
  const deadline = isVoting ? contest.voting_close_at : contest.submissions_close_at

  const copy = isVoting
    ? {
        badge: 'Voting Live',
        headline: `Decide who wins ${inr(pool)}`,
        sub: 'Public votes pick the winner. One vote each — make it count.',
        cta: { href: '/contest', label: '🗳 Vote now' },
        countdownLabel: 'Voting ends in',
        endedLabel: 'Voting has closed',
        stats: [
          [String(entryCount), entryCount === 1 ? 'film competing' : 'films competing'],
          [String(voteCount), voteCount === 1 ? 'vote cast' : 'votes cast'],
          [inr(contest.prize_1st), 'top prize'],
        ] as [string, string][],
      }
    : {
        badge: 'Submissions Open',
        headline: `${inr(pool)} prize pool — get your film in`,
        sub: 'Enter now, then rally your district when voting opens.',
        cta: { href: '/contest/enter', label: '🎬 Enter your film' },
        countdownLabel: 'Entries close in',
        endedLabel: 'Entries have closed',
        stats: [
          [String(entryCount), entryCount === 1 ? 'film entered' : 'films entered'],
          [inr(contest.prize_1st), 'top prize'],
          [contest.entry_fee != null ? inr(contest.entry_fee) : '—', 'to enter'],
        ] as [string, string][],
      }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--surface)] overflow-hidden">
        {/* Accent strip — reads as "this is happening now" at a glance. */}
        <div className="h-1 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017]" />

        <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-black/70 animate-pulse" aria-hidden />
                {copy.badge}
              </span>
              <span className="text-[color:var(--muted)] text-xs">
                Season {contest.season_number ?? 1}
              </span>
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-black text-[color:var(--text)] leading-tight"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {copy.headline}
            </h2>
            <p className="text-[color:var(--muted)] text-xs sm:text-sm mt-1.5">{copy.sub}</p>

            {/* Live numbers — the "something is happening" signal. */}
            <div className="flex items-stretch gap-2 sm:gap-3 mt-4">
              {copy.stats.map(([value, label]) => (
                <div
                  key={label}
                  className="flex-1 min-w-0 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] px-2 py-2.5 text-center"
                >
                  <div className="text-base sm:text-xl font-black text-[color:var(--accent)] tabular-nums whitespace-nowrap">
                    {value}
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[color:var(--muted)] mt-0.5 truncate">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-auto lg:shrink-0 flex flex-col gap-3">
            {deadline && (
              <ContestCountdown
                openAt={deadline}
                label={copy.countdownLabel}
                endedLabel={copy.endedLabel}
              />
            )}
            <Link
              href={copy.cta.href}
              className="block text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] sm:text-sm hover:opacity-90 transition lg:min-w-[240px]"
            >
              {copy.cta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
