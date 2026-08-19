'use client'
// "Continue Watching" — in-progress films with a resume progress bar. DB-backed
// (watch_progress), shown only to logged-in users who have something to resume.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { PROGRESS_EVENT } from '@/lib/watchProgress'

function ytThumb(url?: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}
function hrefFor(f: any) {
  const d = f?.districts
  return `/${d?.states?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${f.id}`
}

export default function ContinueWatchingRail() {
  const { user } = useAuth()
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    if (!user) { setRows([]); return }
    let alive = true
    async function load() {
      const { data } = await supabase
        .from('watch_progress')
        .select('position_sec, duration_sec, films(id, title_en, video_url, districts(name_en, slug, states(slug)))')
        .eq('user_id', user!.id)
        .eq('completed', false)
        .order('updated_at', { ascending: false })
        .limit(12)
      if (!alive) return
      const norm = (data ?? [])
        .map((r: any) => ({ ...r, film: Array.isArray(r.films) ? r.films[0] : r.films }))
        .filter((r: any) => r.film && r.position_sec >= 8)
      setRows(norm)
    }
    load()
    window.addEventListener(PROGRESS_EVENT, load)
    return () => { alive = false; window.removeEventListener(PROGRESS_EVENT, load) }
  }, [user])

  if (rows.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-6 pb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-px h-6 bg-[#FF6B1A]" />
        <span className="text-xs text-[color:var(--accent-hot)] uppercase tracking-[3px] font-semibold">Jump back in</span>
      </div>
      <h2 className="text-2xl font-bold text-[color:var(--text)] mb-6" style={{ fontFamily: "'Georgia', serif" }}>
        ⏯️ Continue Watching
      </h2>

      <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {rows.map((r) => {
          const f = r.film
          const t = ytThumb(f.video_url)
          const pct = r.duration_sec ? Math.min(100, Math.round((r.position_sec / r.duration_sec) * 100)) : 8
          return (
            <Link key={f.id} href={hrefFor(f)} className="flex-shrink-0 w-64 group">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group-hover:border-[color:var(--accent)]/50 transition">
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt={f.title_en} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/25">
                  <div className="h-full bg-[#FF6B1A]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <p className="mt-2 text-[color:var(--text)] text-xs font-bold leading-tight line-clamp-2 group-hover:text-[color:var(--accent)] transition-colors">
                {f.title_en}
              </p>
              <p className="text-[color:var(--muted)] text-[10px] mt-0.5">{f.districts?.name_en}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
