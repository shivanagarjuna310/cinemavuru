// Continue-Watching persistence — DB-backed (watch_progress table), per user.
// Mirrors the watchlist event-bus pattern so rails can refresh live.

import { supabase } from './supabase'

export const PROGRESS_EVENT = 'cv-progress-change'
export function notifyProgressChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROGRESS_EVENT))
}

// A film counts as "finished" past 92% so it drops off the Continue row.
const DONE_RATIO = 0.92

export async function saveProgress(
  userId: string,
  filmId: string,
  positionSec: number,
  durationSec: number | null,
) {
  const completed = durationSec ? positionSec / durationSec >= DONE_RATIO : false
  const { error } = await supabase.from('watch_progress').upsert(
    {
      user_id: userId,
      film_id: filmId,
      position_sec: Math.floor(positionSec),
      duration_sec: durationSec ? Math.floor(durationSec) : null,
      completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,film_id' },
  )
  if (!error) notifyProgressChange()
}

export async function getProgress(userId: string, filmId: string): Promise<number> {
  const { data } = await supabase
    .from('watch_progress')
    .select('position_sec, duration_sec, completed')
    .eq('user_id', userId)
    .eq('film_id', filmId)
    .maybeSingle()
  if (!data || data.completed) return 0
  // Ignore trivial/near-end positions so resume feels sensible.
  const pos = data.position_sec ?? 0
  if (pos < 8) return 0
  if (data.duration_sec && pos > data.duration_sec - 15) return 0
  return pos
}
