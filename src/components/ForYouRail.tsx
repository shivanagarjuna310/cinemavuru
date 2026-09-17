'use client'
// "For You" — films in the genres the viewer chose during onboarding.
// Re-fetches when preferences change (custom event from OnboardingGenres).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import FilmRow from './FilmRow'
import RailSkeleton from './RailSkeleton'
import { useCoalescedRefresh } from '@/lib/useCoalescedRefresh'

const COLS =
  'id, title_en, genre, video_url, view_count, like_count, districts(name_en, slug, states(slug))'

export const PREFS_EVENT = 'cv-prefs-change'

export default function ForYouRail() {
  const { user } = useAuth()
  const [films, setFilms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const uid = user?.id ?? null

  const fetchFilms = useCallback(async () => {
    if (!uid) { setFilms([]); setLoading(false); return }
    const { data: prof } = await supabase
      .from('profiles').select('preferred_genres').eq('id', uid).maybeSingle()
    const genres: string[] = prof?.preferred_genres ?? []
    if (!genres.length) { setFilms([]); setLoading(false); return }
    const { data } = await supabase
      .from('films').select(COLS)
      .eq('status', 'active').in('genre', genres)
      .order('view_count', { ascending: false }).limit(12)
    setFilms(data ?? [])
    setLoading(false)
  }, [uid])

  // Saving preferences dispatches PREFS_EVENT; coalesce so a quick series of
  // genre changes results in one request plus one catch-up, not one per change.
  const load = useCoalescedRefresh(fetchFilms)

  useEffect(() => {
    if (!uid) { setFilms([]); setLoading(false); return }
    setLoading(true)
    load()
    window.addEventListener(PREFS_EVENT, load)
    return () => window.removeEventListener(PREFS_EVENT, load)
  }, [uid, load])

  if (loading && user) return <RailSkeleton />
  if (films.length === 0) return null

  return (
    <FilmRow
      films={films}
      eyebrow="Based on your taste"
      title="✨ For You"
      subtitle="Picked from the genres you love"
      accent="gold"
      metric={(f) => `👁 ${f.view_count} views`}
    />
  )
}
