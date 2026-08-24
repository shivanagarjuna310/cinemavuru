// Film of the Day — the reason to open CinemaVuru tomorrow.
//
// WHY THIS EXISTS: 86% of visitors came exactly once (2,233 of 2,598). The site
// looked identical on every visit — same 81 films, same rails, no event, no
// deadline. A pick that changes at midnight gives a returning visitor something
// new without needing new content, and surfaces the back catalogue instead of
// only ever showing the same top-10 by views.
//
// Two deliberate properties:
//   1. DETERMINISTIC — everyone sees the same film all day, so it is worth
//      sharing and talking about ("did you see today's pick?").
//   2. FAIR ROTATION — it walks the whole library in order rather than picking
//      at random, so every creator gets a turn on the homepage. That is a real
//      incentive to upload, not just a discovery gimmick.
//
// Pure functions, no DB and no side effects, so the pick is identical on the
// server, during ISR revalidation, and in tests.

// The audience is in India; the pick should flip at midnight IST, not UTC.
const IST_OFFSET_MIN = 5 * 60 + 30
const DAY_MS = 24 * 60 * 60 * 1000

/** Days elapsed since the Unix epoch, counted in IST. */
export function istDayNumber(now: Date = new Date()): number {
  return Math.floor((now.getTime() + IST_OFFSET_MIN * 60_000) / DAY_MS)
}

/** Milliseconds until the pick changes (next IST midnight). */
export function msUntilNextPick(now: Date = new Date()): number {
  const shifted = now.getTime() + IST_OFFSET_MIN * 60_000
  return DAY_MS - (shifted % DAY_MS)
}

/**
 * Today's film. Rotates through the library one film per day so the whole
 * catalogue gets exposure, wrapping around when it reaches the end.
 *
 * Sorting by id first makes the order stable regardless of the order rows come
 * back from Postgres — without it, the "pick of the day" could change on every
 * ISR revalidation.
 */
export function pickOfTheDay<T extends { id: string }>(films: T[], now: Date = new Date()): T | null {
  if (!films.length) return null
  const ordered = [...films].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return ordered[istDayNumber(now) % ordered.length]
}

/** "6h 12m" / "48m" / "under a minute" — for the "next pick in …" line. */
export function formatCountdown(ms: number): string {
  if (ms <= 60_000) return 'under a minute'
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
