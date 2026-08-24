// Coming-soon contest promo. Server component — no client JS.
//
// WHY: the contest system was fully built but had zero rows, so nothing on the
// site ever gave a visitor a reason to make an account. A prize pool with real
// numbers is the strongest registration hook available, and it works *before*
// submissions open — people register now so they're ready when they do.
//
// THEMING RULE (learned the hard way): never hardcode a neutral colour here.
// An earlier version used `from-[#1A1208]`, which is the *dark* theme's
// --surface value, so in light mode it painted a dark blob underneath dark text
// and the headline became unreadable. Neutrals must come from CSS variables
// (--bg / --surface / --border / --text / --muted) so they flip with the theme.
// Only brand fills (--gold / --saffron) are safe to use literally, because they
// are identical in both themes by design.
//
// Two variants:
//   compact  → a strip for the homepage and the upload page
//   full     → the hero for /contest while the season is still upcoming
//
// A contest with status 'upcoming' cannot take entries (ContestEntryForm
// requires 'open'), so every CTA points at registration, not submission.
// The entry fee is deliberately NOT shown anywhere public yet.

import Link from 'next/link'

export type ComingSoonContest = {
  title: string
  description?: string | null
  season_number?: number | null
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  submissions_open_at?: string | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

export function openingLine(iso?: string | null): string {
  if (!iso) return 'Dates announced soon'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Dates announced soon'
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days > 1) return `Entries open in ${days} days`
  if (days === 1) return 'Entries open tomorrow'
  if (days === 0) return 'Entries open today'
  return 'Entries opening now'
}

/**
 * 1st / 2nd / 3rd prize cards.
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
                : 'w-4.5 h-4.5 w-[18px] h-[18px] text-[color:var(--muted)] ring-1 ring-[color:var(--border)]'}`}
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
  const opens = openingLine(contest.submissions_open_at)

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
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded">
                  Coming Soon
                </span>
                <span className="text-[color:var(--muted)] text-xs">{opens}</span>
              </div>

              <h3
                className="text-lg sm:text-xl md:text-2xl font-black text-[color:var(--text)] leading-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Win {inr(contest.prize_1st)} for your short film
              </h3>

              <p className="text-[color:var(--muted)] text-xs sm:text-sm mt-1.5">
                {inr(pool)} total prize pool · Season {contest.season_number ?? 1}
              </p>

              <span className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--accent)]">
                Register now to be ready
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

  // ── Full hero (/contest while upcoming) ────────────────────────────────
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-black/70 animate-pulse" aria-hidden />
          Coming Soon
        </span>

        <h1
          className="mt-5 text-3xl sm:text-5xl font-black text-[color:var(--text)] leading-[1.05] tabular-nums"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {inr(pool)} prize pool
        </h1>

        <p
          className="mt-3 text-[color:var(--accent)] text-sm sm:text-base"
          style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
        >
          మీ షార్ట్ ఫిల్మ్‌కి ఇప్పుడు బహుమతి గెలుచుకోండి
        </p>

        <p className="mt-3 text-[color:var(--muted)] text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {contest.description ??
            'Open to every Telugu filmmaker across Telangana and Andhra Pradesh.'}
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-7">
        <Podium c={contest} />

        <div className="mt-6 sm:mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
          {[
            ['🗓', 'Entries', opens],
            ['🗳', 'Winner decided by', 'Public votes from your district'],
          ].map(([icon, label, value]) => (
            <div key={label} className="rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] px-3 py-3.5">
              <div className="text-base mb-1" aria-hidden>{icon}</div>
              <div className="text-[10px] uppercase tracking-widest text-[color:var(--muted)]">{label}</div>
              <div className="text-sm font-semibold text-[color:var(--text)] mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        {/* Registration is the ask: entries aren't open yet, so an account is
            the only meaningful action a visitor can take right now. */}
        <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth"
            className="flex-1 text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] sm:text-sm hover:opacity-90 transition"
          >
            Register free — be first to enter
          </Link>
          <Link
            href="/upload"
            className="flex-1 text-center border border-[color:var(--border)] text-[color:var(--text)] px-5 py-3.5 rounded-xl font-bold uppercase tracking-wide text-[13px] sm:text-sm hover:border-[color:var(--accent)]/50 transition"
          >
            Publish a film now
          </Link>
        </div>

        <p className="text-[color:var(--faint)] text-[11px] text-center mt-4 leading-relaxed">
          Registering is free and takes a few seconds. We&apos;ll tell you the moment entries open —
          publishing films on CinemaVuru is always free.
        </p>
      </div>

      <ol className="mt-8 grid sm:grid-cols-3 gap-3">
        {[
          ['1', 'Register now', 'Free account, ready before entries open.'],
          ['2', 'Submit your film', 'A YouTube link and a few details.'],
          ['3', 'Get votes, win', 'Your district votes. Top 3 take the pool.'],
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <div className="text-[color:var(--accent)] font-black text-sm mb-1">{n}</div>
            <div className="text-[color:var(--text)] font-bold text-sm">{t}</div>
            <div className="text-[color:var(--muted)] text-xs mt-0.5 leading-relaxed">{d}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}
