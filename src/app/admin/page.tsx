'use client'
// src/app/admin/page.tsx
// Protected admin page — only users with role = 'admin' can access.
// Everyone else sees "Access Denied".

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'

type Film = {
  id:          string
  title_en:    string
  title_te:    string | null
  genre:       string | null
  video_url:   string | null
  description: string | null
  status:      string
  created_at:  string
  like_count:  number
  view_count:  number
}

type AccessState = 'checking' | 'denied' | 'granted'

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function AdminPage() {
  const [access,  setAccess]  = useState<AccessState>('checking')
  const [films,   setFilms]   = useState<Film[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState<'pending' | 'active' | 'rejected'>('pending')

  // Check if logged-in user is admin
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccess('denied'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setAccess('granted')
      } else {
        setAccess('denied')
      }
    }
    checkAccess()
  }, [])

  // Fetch films when access granted or filter changes
  useEffect(() => {
    if (access === 'granted') fetchFilms()
  }, [access, filter])

  async function fetchFilms() {
    setLoading(true)
    const { data } = await supabase
      .from('films')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setFilms(data ?? [])
    setLoading(false)
  }

  async function updateStatus(filmId: string, newStatus: 'active' | 'rejected') {
    await supabase
      .from('films')
      .update({ status: newStatus })
      .eq('id', filmId)
    setFilms(prev => prev.filter(f => f.id !== filmId))
  }

  // ── Checking access ──
  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center text-[#7A6040]">
        <p>Checking access...</p>
      </div>
    )
  }

  // ── Access denied ──
  if (access === 'denied') {
    return (
      <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center text-[#FDF6E3]">
        <div className="text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-[#FF6B1A] mb-2">Access Denied</h1>
          <p className="text-[#7A6040] mb-6">You don&apos;t have permission to view this page.</p>
          <a
            href="/"
            className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm"
          >
            Go Home
          </a>
        </div>
      </div>
    )
  }

  // ── Admin dashboard ──
  return (
    <div className="min-h-screen bg-[#0D0A06] text-[#FDF6E3] p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#D4A017]">🎬 CinemaVuru Admin</h1>
            <p className="text-[#7A6040] text-sm mt-1">Review and approve submitted films</p>
          </div>
          <a href="/" className="text-[#7A6040] hover:text-[#D4A017] text-sm transition">
            ← Back to site
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'active', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition capitalize ${
                filter === s
                  ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/40'
                  : 'bg-[#1A1208] text-[#7A6040] border border-[#2E2010] hover:text-[#FDF6E3]'
              }`}
            >
              {s} {filter === s && `(${films.length})`}
            </button>
          ))}
          <button
            onClick={fetchFilms}
            className="ml-auto px-4 py-2 rounded-lg text-sm border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] transition"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Films */}
        {loading ? (
          <div className="text-center py-20 text-[#7A6040]">Loading...</div>
        ) : films.length === 0 ? (
          <div className="text-center py-20 text-[#7A6040]">
            <div className="text-4xl mb-3">✅</div>
            <p>No {filter} films</p>
          </div>
        ) : (
          <div className="space-y-4">
            {films.map(film => (
              <div key={film.id} className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-[#FDF6E3] mb-0.5">{film.title_en}</h3>
                    {film.title_te && (
                      <p className="text-[#7A6040] text-sm mb-2">{film.title_te}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#7A6040] flex-wrap mb-3">
                      <span className="bg-[#2E2010] px-2 py-0.5 rounded">{film.genre}</span>
                      <span>Submitted {timeAgo(film.created_at)}</span>
                      <span>👁 {film.view_count}</span>
                      <span>♥ {film.like_count}</span>
                    </div>
                    {film.description && (
                      <p className="text-sm text-[#7A6040] leading-relaxed mb-3 line-clamp-2">
                        {film.description}
                      </p>
                    )}
                    {film.video_url && (
                      <a
                        href={film.video_url.replace('/embed/', '/watch?v=')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#D4A017] text-xs hover:underline"
                      >
                        ▶ Preview video →
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {filter === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(film.id, 'active')}
                          className="bg-green-700/80 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => updateStatus(film.id, 'rejected')}
                          className="bg-red-900/60 hover:bg-red-800 text-red-300 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition"
                        >
                          ❌ Reject
                        </button>
                      </>
                    )}
                    {filter === 'rejected' && (
                      <button
                        onClick={() => updateStatus(film.id, 'active')}
                        className="border border-green-700/40 text-green-400 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-green-700/20 transition"
                      >
                        ↩ Approve
                      </button>
                    )}
                    {filter === 'active' && (
                      <button
                        onClick={() => updateStatus(film.id, 'rejected')}
                        className="border border-red-700/40 text-red-400 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-red-700/20 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
