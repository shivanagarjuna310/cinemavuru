// Contest standings must not inherit a film's lifetime popularity. A film that
// has been on the site for months would show hundreds of likes next to a fresh
// entry showing zero, which reads as a head start nobody can catch up on — so
// every engagement number on a contest surface counts only what the film earned
// after it entered.
//
// Shared by /contest and /contest/films. It previously lived only in /contest,
// and /contest/films rendered `views_since ?? 0`, so every film there showed
// zero views.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function withEntryScopedStats<T extends { film_id: string; created_at: string }>(
  entries: T[],
): Promise<(T & { likes_since: number; views_since: number })[]> {
  if (!entries.length) return []

  const filmIds = entries.map((e) => e.film_id).filter(Boolean)
  // One query each, bounded by the earliest entry, then split per film below.
  const earliest = entries.reduce(
    (min, e) => (e.created_at < min ? e.created_at : min),
    entries[0].created_at,
  )

  const [likeRes, viewRes] = await Promise.all([
    supabase.from('likes').select('film_id, created_at')
      .in('film_id', filmIds).gte('created_at', earliest),
    supabase.from('film_views').select('film_id, viewed_date')
      .in('film_id', filmIds).gte('viewed_date', earliest.slice(0, 10)),
  ])
  const likeRows = likeRes.data ?? []
  const viewRows = viewRes.data ?? []

  return entries.map((e) => {
    const sinceTs = new Date(e.created_at).getTime()
    const sinceDay = e.created_at.slice(0, 10)   // viewed_date is a DATE
    return {
      ...e,
      likes_since: likeRows.filter(
        (l) => l.film_id === e.film_id && new Date(l.created_at).getTime() >= sinceTs,
      ).length,
      views_since: viewRows.filter(
        (v) => v.film_id === e.film_id && String(v.viewed_date) >= sinceDay,
      ).length,
    }
  })
}
