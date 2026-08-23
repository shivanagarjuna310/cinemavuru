'use client'
// Creator notifications bell: activity on the user's OWN films — view/like
// milestones, new comments, new followers, and "trending" status. Kept limited
// (max 12, most useful) and non-repetitive via a local last-seen cursor.

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { VIEW_MILESTONES, LIKE_MILESTONES, highestReached, fmt } from '@/lib/milestones'

const SEEN_AT = 'cv_creator_seen_at'
const MS_MAP  = 'cv_creator_ms'

type Item = { key: string; icon: string; text: string; sub?: string; href?: string; ts: number; unread: boolean }

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CreatorBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const filmsRef = useRef<any[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) { setItems([]); setUnread(0); return }
    let alive = true
    ;(async () => {
      const uid = user.id
      const { data: films } = await supabase
        .from('films')
        .select('id, title_en, video_url, view_count, like_count, districts(slug, states(slug))')
        .eq('creator_id', uid)
      const myFilms = films ?? []
      filmsRef.current = myFilms
      const ids = myFilms.map((f: any) => f.id)
      const info = new Map<string, { title: string; href: string }>(myFilms.map((f: any) => {
        const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
        const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
        return [f.id, { title: f.title_en, href: `/${s?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${f.id}` }]
      }))

      const [commRes, folRes, trendRes] = await Promise.all([
        ids.length
          ? supabase.from('comments').select('id, text, created_at, film_id').in('film_id', ids).order('created_at', { ascending: false }).limit(10)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from('follows').select('created_at').eq('creator_id', uid).order('created_at', { ascending: false }).limit(50),
        supabase.from('films').select('id').eq('status', 'active').order('view_count', { ascending: false }).limit(10),
      ])
      if (!alive) return

      const firstRun = !localStorage.getItem(SEEN_AT)
      const seenAt = Number(localStorage.getItem(SEEN_AT) ?? '0')
      let ms: Record<string, number> = {}
      try { ms = JSON.parse(localStorage.getItem(MS_MAP) ?? '{}') } catch {}

      const list: Item[] = []

      // Milestones from current counts (readable without extra tables)
      for (const f of myFilms as any[]) {
        const vm = highestReached(f.view_count ?? 0, VIEW_MILESTONES)
        const lm = highestReached(f.like_count ?? 0, LIKE_MILESTONES)
        const meta = info.get(f.id)!
        if (vm > 0) list.push({ key: `v-${f.id}`, icon: '📈', text: `"${meta.title}" reached ${fmt(vm)} views`, href: meta.href, ts: Date.now(), unread: !firstRun && vm > (ms[`${f.id}:v`] ?? 0) })
        if (lm > 0) list.push({ key: `l-${f.id}`, icon: '❤️', text: `"${meta.title}" reached ${fmt(lm)} likes`, href: meta.href, ts: Date.now(), unread: !firstRun && lm > (ms[`${f.id}:l`] ?? 0) })
      }

      // New comments on my films
      for (const c of (commRes.data ?? []) as any[]) {
        const meta = info.get(c.film_id); if (!meta) continue
        const ts = new Date(c.created_at).getTime()
        list.push({ key: `c-${c.id}`, icon: '💬', text: `New comment on "${meta.title}"`, sub: (c.text || '').slice(0, 60), href: meta.href, ts, unread: !firstRun && ts > seenAt })
      }

      // Followers
      const fol = (folRes.data ?? []) as any[]
      if (fol.length) {
        const newN = firstRun ? 0 : fol.filter(x => new Date(x.created_at).getTime() > seenAt).length
        list.push({ key: 'followers', icon: '➕', text: newN > 0 ? `${newN} new follower${newN > 1 ? 's' : ''}` : `${fol.length} follower${fol.length > 1 ? 's' : ''}`, href: `/creator/${uid}`, ts: new Date(fol[0].created_at).getTime(), unread: newN > 0 })
      }

      // Trending (informational, never badged)
      const trend = new Set(((trendRes.data ?? []) as any[]).map(x => x.id))
      for (const f of myFilms as any[]) {
        if (trend.has(f.id)) { const meta = info.get(f.id)!; list.push({ key: `t-${f.id}`, icon: '🔥', text: `"${meta.title}" is trending`, href: meta.href, ts: Date.now() + 1, unread: false }) }
      }

      list.sort((a, b) => b.ts - a.ts)
      const capped = list.slice(0, 12)
      setItems(capped)
      setUnread(capped.filter(i => i.unread).length)

      if (firstRun) markSeen()  // baseline so the first visit isn't a wall of "new"
    })()
    return () => { alive = false }
  }, [user])

  function markSeen() {
    try {
      localStorage.setItem(SEEN_AT, String(Date.now()))
      let prev: Record<string, number> = {}
      try { prev = JSON.parse(localStorage.getItem(MS_MAP) ?? '{}') } catch {}
      for (const f of filmsRef.current) {
        prev[`${f.id}:v`] = highestReached(f.view_count ?? 0, VIEW_MILESTONES)
        prev[`${f.id}:l`] = highestReached(f.like_count ?? 0, LIKE_MILESTONES)
      }
      localStorage.setItem(MS_MAP, JSON.stringify(prev))
    } catch {}
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) { markSeen(); setUnread(0) }
  }

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label="Notifications"
        className="relative text-[color:var(--muted)] hover:text-[color:var(--accent)] transition p-2 rounded hover:bg-[#D4A017]/10">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#FF6B1A] text-black text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
            <span className="text-sm font-bold text-[color:var(--text)]">Your activity</span>
            <span className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">CinemaVuru</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[color:var(--muted)] text-sm">
                <div className="text-2xl mb-2">🔔</div>
                Upload a film to start getting activity here.
              </div>
            ) : items.map(i => {
              const inner = (
                <>
                  <span className="text-lg flex-shrink-0 mt-0.5">{i.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[color:var(--text)] leading-snug">{i.text}</p>
                    {i.sub && <p className="text-xs text-[color:var(--muted)] truncate mt-0.5">“{i.sub}”</p>}
                    <p className="text-[10px] text-[color:var(--faint)] mt-0.5">{timeAgo(i.ts)}</p>
                  </div>
                  {i.unread && <span className="w-2 h-2 rounded-full bg-[#FF6B1A] flex-shrink-0 mt-1.5" />}
                </>
              )
              const cls = `flex items-start gap-3 px-3 py-2.5 border-b border-[color:var(--border)] last:border-0 ${i.unread ? 'bg-[#FF6B1A]/5' : ''}`
              return i.href
                ? <Link key={i.key} href={i.href} onClick={() => setOpen(false)} className={`${cls} hover:bg-[color:var(--surface)] transition`}>{inner}</Link>
                : <div key={i.key} className={cls}>{inner}</div>
            })}
          </div>
          <Link href="/profile" onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--surface)] border-t border-[color:var(--border)] transition">
            Manage in your profile →
          </Link>
        </div>
      )}
    </div>
  )
}
