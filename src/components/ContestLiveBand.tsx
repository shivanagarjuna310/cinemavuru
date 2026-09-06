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
import CountUp from './CountUp'

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

/** A stat tile either counts up to a number or shows fixed text. */
type Stat =
  | { n: number; label: string; text?: never }
  | { text: string; label: string; n?: never }

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
          { n: entryCount, label: entryCount === 1 ? 'film competing' : 'films competing' },
          { n: voteCount, label: voteCount === 1 ? 'vote cast' : 'votes cast' },
          { text: inr(contest.prize_1st), label: 'top prize' },
        ] as Stat[],
      }
    : {
        badge: 'Submissions Open',
        headline: `${inr(pool)} prize pool — get your film in`,
        sub: 'Enter now, then rally your district when voting opens.',
        cta: { href: '/contest/enter', label: '🎬 Enter your film' },
        countdownLabel: 'Entries close in',
        endedLabel: 'Entries have closed',
        stats: [
          { n: entryCount, label: entryCount === 1 ? 'film entered' : 'films entered' },
          { text: inr(contest.prize_1st), label: 'top prize' },
          { text: contest.entry_fee != null ? inr(contest.entry_fee) : '—', label: 'to enter' },
        ] as Stat[],
      }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
      {/* Animated brand edge: this gradient wrapper shows through as a 1.5px
          border around the inner card, and the gradient itself travels.
          Cheaper than animating a border colour, and it never causes layout. */}
      <div className="anim-edge relative rounded-2xl p-[1.5px] shadow-lg shadow-orange-900/10">
        {/* Breathing glow behind the card. Brand fills only, so it reads the
            same in light and dark without touching the theme neutrals. */}
        <div
          aria-hidden
          className="anim-breathe pointer-events-none absolute -inset-3 rounded-3xl blur-2xl"
          style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(255,107,26,.28), transparent 70%)' }}
        />

        <div className="relative rounded-[14px] bg-[color:var(--surface)] overflow-hidden">
          {/* Faint brand wash so the card is not flat surface colour. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(120% 90% at 0% 0%, rgba(212,160,23,.10), transparent 60%)' }}
          />

          <div className="relative p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded">
                {/* A solid core with an expanding ring reads as "live" far
                    better than a fading opacity pulse. */}
                <span className="relative inline-flex w-1.5 h-1.5" aria-hidden>
                  <span className="anim-ping absolute inline-flex w-full h-full rounded-full bg-black/60" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-black/80" />
                </span>
                {copy.badge}
              </span>
              <span className="text-[color:var(--muted)] text-xs">
                Season {contest.season_number ?? 1}
              </span>
            </div>

            <h2
              className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight ${
                isVoting ? 'text-shimmer' : 'text-[color:var(--text)]'
              }`}
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {copy.headline}
            </h2>
            <p className="text-[color:var(--muted)] text-xs sm:text-sm mt-1.5">{copy.sub}</p>

            {/* Live numbers — the "something is happening" signal. */}
            <div className="flex items-stretch gap-2 sm:gap-3 mt-4">
              {copy.stats.map(stat => (
                <div
                  key={stat.label}
                  className="flex-1 min-w-0 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] px-2 py-2.5 text-center transition-all duration-300 hover:border-[color:var(--accent)]/50 hover:-translate-y-0.5"
                >
                  <div className="text-base sm:text-xl font-black text-[color:var(--accent)] tabular-nums whitespace-nowrap">
                    {typeof stat.n === 'number' ? <CountUp value={stat.n} /> : stat.text}
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[color:var(--muted)] mt-0.5 truncate">
                    {stat.label}
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
              className="group relative block text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] sm:text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-900/30 lg:min-w-[240px]"
            >
              <span
                aria-hidden
                className="anim-breathe pointer-events-none absolute -inset-1 rounded-2xl blur-md"
                style={{ background: 'linear-gradient(90deg, rgba(255,107,26,.45), rgba(212,160,23,.45))' }}
              />
              <span className="relative">{copy.cta.label}</span>
            </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
