'use client'
// Homepage "My List" rail — reads the hybrid watchlist (Supabase when
// available, else localStorage). Renders nothing when empty.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { type SavedFilm, getWatchlist, removeFromWatchlist, WATCHLIST_EVENT } from '@/lib/watchlist'

function thumb(url: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default function MyListRail() {
  const [items, setItems] = useState<SavedFilm[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const list = await getWatchlist()
      if (!cancelled) setItems(list)
    }
    load()
    window.addEventListener(WATCHLIST_EVENT, load)
    window.addEventListener('storage', load)
    // Re-load when auth state changes (sign in/out swaps cloud ↔ local list)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => load())
    return () => {
      cancelled = true
      window.removeEventListener(WATCHLIST_EVENT, load)
      window.removeEventListener('storage', load)
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function remove(id: string) {
    setItems(prev => prev.filter(f => f.id !== id)) // optimistic
    await removeFromWatchlist(id)
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
        {items.map(f => {
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
              <Link href={`/${f.stateSlug}/${f.districtSlug}/film/${f.id}`}>
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
                {f.districtName && <p className="text-[color:var(--muted)] text-[10px] mt-0.5">{f.districtName}</p>}
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
