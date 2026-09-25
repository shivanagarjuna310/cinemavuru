// Filmmaker tiers.
//
// A pure function over stats the caller already has — no queries — so it is
// safe to call in a server page, a client component or an OG image route.
//
// THRESHOLDS ARE SET FROM THE REAL DISTRIBUTION, not from round numbers.
// Measured across the 134 creators with an active film:
//
//   p50   15 views      p75   52 views
//   p90  149 views      p95  270 views
//   >=100 views: 25 creators   >=250: 7   >=500: 3
//
// So Notable (100) is roughly the top fifth and Featured (500) the top 2%.
// That matters: a tier nobody can reach is worse than no tier, and the same
// goes for a progress hint. The supporter thresholds are lower than they look
// because the whole platform has 53 follows and the best-followed creator has
// 8 — 5 supporters is a real achievement here today, and the view path stays
// available to anyone who is watched but not followed.
//
// Hall of Fame is not earned by volume; it is awarded by winning a season, so
// it overrides whatever the numbers say.

export type TierKey = 'rising' | 'notable' | 'featured' | 'hall_of_fame'

export type Tier = {
  key: TierKey
  label: string
  emoji: string
  /** One line, addressed to the filmmaker. */
  blurb: string
  /** Tailwind classes for the badge. Theme vars so light mode works. */
  className: string
  minViews: number
  minSupporters: number
}

export type CreatorStats = {
  views: number
  supporters: number
  isWinner?: boolean
}

// Ordered weakest → strongest. tierFor walks this backwards.
export const TIERS: Tier[] = [
  {
    key: 'rising',
    label: 'Rising Filmmaker',
    emoji: '🌱',
    blurb: 'You have published on CinemaVuru. Keep going.',
    className: 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)]',
    minViews: 0,
    minSupporters: 0,
  },
  {
    key: 'notable',
    label: 'Notable Filmmaker',
    emoji: '⭐',
    blurb: 'Your work is finding an audience beyond your own circle.',
    className: 'bg-[#FF6B1A]/12 text-[color:var(--accent-hot)] ring-[color:var(--accent-hot)]/40',
    minViews: 100,
    minSupporters: 5,
  },
  {
    key: 'featured',
    label: 'Featured Filmmaker',
    emoji: '🔥',
    blurb: 'Among the most-watched filmmakers on the platform.',
    className: 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/45',
    minViews: 500,
    minSupporters: 25,
  },
  {
    key: 'hall_of_fame',
    label: 'Hall of Fame',
    emoji: '🏆',
    blurb: 'A CinemaVuru season winner.',
    className: 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black ring-transparent',
    minViews: Infinity,
    minSupporters: Infinity,
  },
]

const byKey = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<TierKey, Tier>

/** Either threshold qualifies — a filmmaker who is widely watched but not yet
 *  followed should not be stuck below one who has five friends. */
export function tierFor(stats: CreatorStats): Tier {
  if (stats.isWinner) return byKey.hall_of_fame
  for (let i = TIERS.length - 2; i >= 0; i--) {
    const t = TIERS[i]
    if (stats.views >= t.minViews || stats.supporters >= t.minSupporters) return t
  }
  return byKey.rising
}

export type TierProgress = {
  next: Tier
  /** Whichever route is closer, expressed as what is still missing. */
  viewsToGo: number
  supportersToGo: number
  /** 0–1 along the nearer of the two routes. */
  fraction: number
}

/** The next rung and the shortest way to it, or null at the top.
 *
 *  Only ever describes the immediately next tier. Showing a filmmaker on 9
 *  views that they need 491 more is demotivating; showing they need 91 is a
 *  target. */
export function nextTier(stats: CreatorStats): TierProgress | null {
  if (stats.isWinner) return null
  const current = tierFor(stats)
  const idx = TIERS.findIndex((t) => t.key === current.key)
  const next = TIERS[idx + 1]
  if (!next || next.key === 'hall_of_fame') return null

  const viewsToGo = Math.max(next.minViews - stats.views, 0)
  const supportersToGo = Math.max(next.minSupporters - stats.supporters, 0)
  const fraction = Math.min(
    1,
    Math.max(stats.views / next.minViews, stats.supporters / next.minSupporters),
  )
  return { next, viewsToGo, supportersToGo, fraction }
}
