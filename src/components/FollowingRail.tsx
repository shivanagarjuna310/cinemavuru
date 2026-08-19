'use client'
// "New from creators you follow" — recent films by followed filmmakers.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import FilmRow from './FilmRow'

const COLS =
  'id, title_en, genre, video_url, view_count, like_count, districts(name_en, slug, states(slug))'

export default function FollowingRail() {
  const { user } = useAuth()
  const [films, setFilms] = useState<any[]>([])

  useEffect(() => {
    if (!user) { setFilms([]); return }
    let alive = true
    ;(async () => {
      const { data: f } = await supabase
        .from('follows').select('creator_id').eq('follower_id', user.id)
      const ids = (f ?? []).map((x: any) => x.creator_id)
      if (!ids.length) { if (alive) setFilms([]); return }
      const { data } = await supabase
        .from('films').select(COLS)
        .eq('status', 'active').in('creator_id', ids)
        .order('created_at', { ascending: false }).limit(12)
      if (alive) setFilms(data ?? [])
    })()
    return () => { alive = false }
  }, [user])

  if (films.length === 0) return null

  return (
    <FilmRow
      films={films}
      eyebrow="From filmmakers you follow"
      title="🔔 New From Your Follows"
      accent="green"
      metric={(f) => `👁 ${f.view_count} views`}
    />
  )
}
