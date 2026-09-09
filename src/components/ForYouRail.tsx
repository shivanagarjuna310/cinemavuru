'use client'
// "For You" — films in the genres the viewer chose during onboarding.
// Re-fetches when preferences change (custom event from OnboardingGenres).

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import FilmRow from './FilmRow'
import RailSkeleton from './RailSkeleton'

const COLS =
  'id, title_en, genre, video_url, view_count, like_count, districts(name_en, slug, states(slug))'

export const PREFS_EVENT = 'cv-prefs-change'

export default function ForYouRail() {
  const { user } = useAuth()
  const [films, setFilms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setFilms([]); setLoading(false); return }
    setLoading(true)
    let alive = true
    async function load() {
      const { data: prof } = await supabase
        .from('profiles').select('preferred_genres').eq('id', user!.id).maybeSingle()
      const genres: string[] = prof?.preferred_genres ?? []
      if (!genres.length) { if (alive) { setFilms([]); setLoading(false) } return }
      const { data } = await supabase
        .from('films').select(COLS)
        .eq('status', 'active').in('genre', genres)
        .order('view_count', { ascending: false }).limit(12)
      if (alive) { setFilms(data ?? []); setLoading(false) }
    }
    load()
    window.addEventListener(PREFS_EVENT, load)
    return () => { alive = false; window.removeEventListener(PREFS_EVENT, load) }
  }, [user])

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
