'use client'
// Homepage "My List" rail — the signed-in viewer's saved films from the
// Supabase `watchlist` table (no local storage). Hidden when empty / signed out.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { WATCHLIST_EVENT } from '@/lib/watchlist'

function thumb(url: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default function MyListRail() {
  const [items, setItems] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    if (!user) { setItems([]); return }
    const { data } = await supabase
      .from('watchlist')
      .select('film_id, created_at, films(id, title_en, video_url, districts(name_en, slug, states(slug)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems((data ?? []).filter((r: any) => r.films))
  }

  useEffect(() => {
    load()
    window.addEventListener(WATCHLIST_EVENT, load)
    const { data: authSub } = supabase.auth.onAuthStateChange(() => load())
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, load)
      authSub.subscription.unsubscribe()
    }
  }, [])

  async function remove(filmId: string) {
    if (!userId) return
    setItems(prev => prev.filter((r: any) => r.film_id !== filmId)) // optimistic
    await supabase.from('watchlist').delete().eq('user_id', userId).eq('film_id', filmId)
  }

  if (items.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-6 pb-12 pt-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-px h-6 bg-[#D4A017]" />
        <span className="text-xs text-[color:var(--accent)] uppercase tracking-[3px] font-semibold">Your Watchlist</span>
      </div>
      <h2 className="text-2xl font-bold text-[color:var(--text)] mb-6" style={{ fontFamily: "'Georgia', serif" }}>
        🔖 My List
      </h2>

      <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {items.map((r: any) => {
          const f = r.films
          const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
          const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
          const stateSlug = s?.slug ?? 'telangana'
          const districtSlug = d?.slug ?? 'hyderabad'
          const t = thumb(f.video_url)
          return (
            <div key={f.id} className="relative flex-shrink-0 w-56 group">
              <button
                onClick={() => remove(f.id)}
                aria-label="Remove from My List"
                className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
              >
                ✕
              </button>
              <Link href={`/${stateSlug}/${districtSlug}/film/${f.id}`}>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group-hover:border-[color:var(--accent)]/50 transition-all duration-300">
                  {t ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t} alt={f.title_en} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <p className="text-[color:var(--text)] text-xs font-bold leading-tight line-clamp-2 mt-2 group-hover:text-[color:var(--accent)] transition-colors">
                  {f.title_en}
                </p>
                <p className="text-[color:var(--muted)] text-[10px] mt-0.5">{d?.name_en}</p>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
