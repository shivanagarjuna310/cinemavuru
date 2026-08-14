'use client'
// src/components/MyFilms.tsx
// Shows a creator's own films with option to delete them.
// Appears on the Upload page after they upload.

import { useState, useEffect, useCallback } from 'react'
import { useRouter }  from 'next/navigation'
import { supabase }   from '@/lib/supabase'
import { useAuth }    from './AuthProvider'

type Film = {
  id:         string
  title_en:   string
  title_te:   string | null
  genre:      string | null
  status:     string
  view_count: number
  like_count: number
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  active:   'text-green-400 bg-green-900/20 border-green-700/30',
  pending:  'text-[color:var(--accent)] bg-[#D4A017]/10 border-[color:var(--accent)]/30',
  rejected: 'text-red-400 bg-red-900/20 border-red-700/30',
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function MyFilms() {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [films,    setFilms]    = useState<Film[]>([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchMyFilms = useCallback(async (uid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('films')
      .select('id, title_en, title_te, genre, status, view_count, like_count, created_at')
      .eq('creator_id', uid)
      .order('created_at', { ascending: false })
    setFilms(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (userId) fetchMyFilms(userId)
  }, [userId, fetchMyFilms])

  async function handleDelete(film: Film) {
    const confirmed = window.confirm(
      `Delete "${film.title_en}"?\n\nThis will permanently remove the film and all its likes and comments.`
    )
    if (!confirmed) return

    setDeleting(film.id)

    await Promise.all([
      supabase.from('likes').delete().eq('film_id', film.id),
      supabase.from('comments').delete().eq('film_id', film.id),
      supabase.from('film_views').delete().eq('film_id', film.id),
      supabase.from('contest_entries').delete().eq('film_id', film.id),
    ])

    const { error } = await supabase.from('films').delete().eq('id', film.id)

    if (error) {
      alert(`Could not delete: ${error.message}`)
    } else {
      setFilms(prev => prev.filter(f => f.id !== film.id))
    }

    setDeleting(null)
  }

  if (!userId) return null

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[color:var(--accent)]">Your Films</h2>
        <button onClick={() => userId && fetchMyFilms(userId)}
          className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] transition">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[color:var(--muted)] text-sm">Loading your films...</div>
      ) : films.length === 0 ? (
        <div className="text-center py-8 text-[color:var(--muted)]">
          <div className="text-3xl mb-2">🎬</div>
          <p className="text-sm">You haven&apos;t uploaded any films yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {films.map(film => (
            <div key={film.id} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-[color:var(--text)] text-sm line-clamp-1">
                      {film.title_en}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_STYLE[film.status] ?? 'text-[color:var(--muted)]'}`}>
                      {film.status === 'pending' ? '⏳ Under Review' : film.status === 'active' ? '✅ Live' : '❌ Rejected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                    <span>{film.genre}</span>
                    <span>·</span>
                    <span>👁 {film.view_count}</span>
                    <span>·</span>
                    <span>♥ {film.like_count}</span>
                    <span>·</span>
                    <span>{timeAgo(film.created_at)}</span>
                  </div>
                  {film.status === 'pending' && (
                    <p className="text-[10px] text-[color:var(--muted)] mt-1">
                      Admin is reviewing your film. Usually approved within 24 hours.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {film.status === 'active' && (
                    <button
                      onClick={() => router.push(`/telangana/hyderabad/film/${film.id}`)}
                      className="border border-[color:var(--accent)]/30 text-[color:var(--accent)] px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-[#D4A017]/10 transition"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(film)}
                    disabled={deleting === film.id}
                    className="border border-red-900/50 text-red-500 hover:bg-red-900/20 hover:text-red-400 px-3 py-1.5 rounded text-xs font-bold uppercase transition disabled:opacity-40"
                  >
                    {deleting === film.id ? '⏳' : '🗑 Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
