// The tier chip. Pure presentation — no client hooks — so it renders inside
// server pages as well as client ones.

import { tierFor, type CreatorStats, type Tier } from '@/lib/tiers'

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
} as const

export default function TierBadge({
  stats,
  tier,
  size = 'md',
  showLabel = true,
}: {
  /** Pass stats and let the badge decide, or pass a resolved tier directly. */
  stats?: CreatorStats
  tier?: Tier
  size?: keyof typeof SIZES
  showLabel?: boolean
}) {
  const t = tier ?? (stats ? tierFor(stats) : null)
  if (!t) return null

  return (
    <span
      title={t.blurb}
      className={`inline-flex items-center rounded-full font-bold ring-1 whitespace-nowrap ${SIZES[size]} ${t.className}`}
    >
      <span aria-hidden>{t.emoji}</span>
      {showLabel && <span>{t.label}</span>}
    </span>
  )
}
