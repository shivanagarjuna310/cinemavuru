'use client'
// Admin traffic metrics — visits over time, from the film_views table
// (unique per IP per day, bots filtered). Cheap head-count queries only.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function dstr(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n) }

export default function TrafficPanel() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [total, setTotal] = useState(0)
  const [today, setToday] = useState(0)
  const [d7, setD7] = useState(0)
  const [d30, setD30] = useState(0)
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([])

  async function count(build?: (q: any) => any) {
    let q = supabase.from('film_views').select('film_id', { count: 'exact', head: true })
    if (build) q = build(q)
    const { count: c, error } = await q
    if (error) throw error
    return c ?? 0
  }

  async function load() {
    setLoading(true); setErr('')
    try {
      const todayStr = dstr(0)
      const [t, td, w, m] = await Promise.all([
        count(),
        count(q => q.eq('viewed_date', todayStr)),
        count(q => q.gte('viewed_date', dstr(6))),
        count(q => q.gte('viewed_date', dstr(29))),
      ])
      const days = Array.from({ length: 14 }, (_, i) => dstr(13 - i))
      const counts = await Promise.all(days.map(d => count(q => q.eq('viewed_date', d))))
      setTotal(t); setToday(td); setD7(w); setD30(m)
      setTrend(days.map((date, i) => ({ date, count: counts[i] })))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load traffic')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const kpis = [
    { label: 'Total visits', value: fmt(total) },
    { label: 'Today', value: fmt(today) },
    { label: 'Last 7 days', value: fmt(d7) },
    { label: 'Last 30 days', value: fmt(d30) },
  ]
  const max = Math.max(1, ...trend.map(t => t.count))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs text-[color:var(--muted)]">
          Page visits from <strong className="text-[color:var(--text)]">film views</strong> (unique per visitor per day, bots excluded).
        </p>
        <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition">↻ Refresh</button>
      </div>

      {err && <p className="text-red-400 text-sm mb-4">{err}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-[color:var(--accent)]">{loading ? '…' : k.value}</div>
            <div className="text-[10px] text-[color:var(--muted)] uppercase tracking-[2px] mt-1 font-medium">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[color:var(--text)] mb-4">Last 14 days</h3>
        {loading ? (
          <p className="text-[color:var(--muted)] text-sm py-8 text-center">Loading…</p>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {trend.map(t => (
              <div key={t.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                <span className="text-[9px] text-[color:var(--muted)] mb-1 opacity-0 group-hover:opacity-100 transition">{t.count}</span>
                <div className="w-full rounded-t bg-gradient-to-t from-[#FF6B1A] to-[#D4A017] transition-all"
                  style={{ height: `${Math.max(2, (t.count / max) * 100)}%` }} title={`${t.date}: ${t.count}`} />
                <span className="text-[9px] text-[color:var(--faint)] mt-1">{t.date.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[color:var(--faint)] text-[11px] mt-4">
        This counts film-page visits. For full site traffic (all pages, sessions, top pages, countries) see
        <strong className="text-[color:var(--muted)]"> Vercel → Analytics</strong> (already enabled).
      </p>
    </div>
  )
}
