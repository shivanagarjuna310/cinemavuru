// Account-bound "My List" watchlist.
//  • Signed-in + `watchlist` table present → Supabase (per-user cloud sync)
//  • Signed-in, table not migrated         → localStorage keyed by user id
//  • Signed out                            → empty (My List is account-only)
// Keying local storage per user (and returning empty when logged out) means
// the list never leaks across accounts and clears from the UI on logout.

import { supabase } from './supabase'

export type SavedFilm = {
  id: string
  title_en: string
  video_url: string | null
  stateSlug: string
  districtSlug: string
  districtName: string
}

export const WATCHLIST_EVENT = 'cv-watchlist'

// null = unknown, true/false = probed (avoids repeated failing calls)
let dbAvailable: boolean | null = null

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WATCHLIST_EVENT))
}
function lkey(userId: string) { return `cv_watchlist:${userId}` }
function readLocal(userId: string): SavedFilm[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(lkey(userId)) || '[]') } catch { return [] }
}
function writeLocal(userId: string, list: SavedFilm[]) {
  try { localStorage.setItem(lkey(userId), JSON.stringify(list)); notify() } catch { /* ignore */ }
}
async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function isSaved(id: string): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false
  if (dbAvailable !== false) {
    const { data, error } = await supabase
      .from('watchlist').select('film_id')
      .eq('user_id', user.id).eq('film_id', id).maybeSingle()
    if (!error) { dbAvailable = true; return !!data }
    dbAvailable = false
  }
  return readLocal(user.id).some(f => f.id === id)
}

/** Add/remove; returns the new saved state. Returns false (no-op) if signed out. */
export async function toggleWatchlist(film: SavedFilm): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false
  if (dbAvailable !== false) {
    const { data: existing, error } = await supabase
      .from('watchlist').select('film_id')
      .eq('user_id', user.id).eq('film_id', film.id).maybeSingle()
    if (!error) {
      dbAvailable = true
      if (existing) {
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('film_id', film.id)
        notify(); return false
      }
      await supabase.from('watchlist').insert({ user_id: user.id, film_id: film.id })
      notify(); return true
    }
    dbAvailable = false
  }
  const list = readLocal(user.id)
  const exists = list.some(f => f.id === film.id)
  writeLocal(user.id, exists ? list.filter(f => f.id !== film.id) : [film, ...list].slice(0, 60))
  return !exists
}

export async function getWatchlist(): Promise<SavedFilm[]> {
  const user = await currentUser()
  if (!user) return []
  if (dbAvailable !== false) {
    const { data, error } = await supabase
      .from('watchlist')
      .select('film_id, created_at, films(id, title_en, video_url, districts(name_en, slug, states(slug)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) {
      dbAvailable = true
      return (data ?? [])
        .filter((r: any) => r.films)
        .map((r: any) => {
          const f = r.films
          const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
          const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
          return {
            id: f.id,
            title_en: f.title_en,
            video_url: f.video_url,
            stateSlug: s?.slug ?? 'telangana',
            districtSlug: d?.slug ?? 'hyderabad',
            districtName: d?.name_en ?? '',
          } as SavedFilm
        })
    }
    dbAvailable = false
  }
  return readLocal(user.id)
}

export async function removeFromWatchlist(id: string) {
  const user = await currentUser()
  if (!user) return
  if (dbAvailable) {
    await supabase.from('watchlist').delete().eq('user_id', user.id).eq('film_id', id)
    notify(); return
  }
  writeLocal(user.id, readLocal(user.id).filter(f => f.id !== id))
}
