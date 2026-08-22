// Pure milestone helpers (no DB / no side effects) — used by the milestone
// email cron. Kept separate so the thresholds + logic are easy to tune/test.

export const VIEW_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]
export const LIKE_MILESTONES = [25, 50, 100, 250, 500, 1000, 2500, 5000]

// Highest milestone already reached (0 if none).
export function highestReached(value: number, ms: number[]): number {
  let reached = 0
  for (const m of ms) if (value >= m) reached = m
  return reached
}

// The next milestone above `value` (null if past the top).
export function nextMilestone(value: number, ms: number[]): number | null {
  for (const m of ms) if (value < m) return m
  return null
}

// "Almost there" — within the final stretch toward the next milestone.
// Returns the target + how many remain, or null if not close yet / maxed out.
export function almostNext(
  value: number,
  ms: number[],
  ratio = 0.8,
): { target: number; remaining: number } | null {
  const next = nextMilestone(value, ms)
  if (next === null) return null
  const remaining = next - value
  if (remaining > 0 && value >= Math.ceil(next * ratio)) return { target: next, remaining }
  return null
}

export function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n)
}
