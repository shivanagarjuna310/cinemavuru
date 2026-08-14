'use client'
// "＋ My List" / "✓ Saved" toggle — persisted per-user in the Supabase
// `watchlist` table. Uses the shared auth context (no session reads here).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { WATCHLIST_EVENT, notifyWatchlistChange } from '@/lib/watchlist'

export default function WatchlistButton({ filmId, className = '' }: { filmId: string; className?: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function sync() {
      if (!userId) { setSaved(false); return }
      const { data } = await supabase
        .from('watchlist').select('film_id')
        .eq('user_id', userId).eq('film_id', filmId).maybeSingle()
      if (!cancelled) setSaved(!!data)
    }
    sync()
    window.addEventListener(WATCHLIST_EVENT, sync)
    return () => { cancelled = true; window.removeEventListener(WATCHLIST_EVENT, sync) }
  }, [filmId, userId])

  async function onClick() {
    if (busy) return
    if (!userId) { router.push('/auth'); return }
    setBusy(true)
    if (saved) {
      const { error } = await supabase.from('watchlist').delete().eq('user_id', userId).eq('film_id', filmId)
      if (!error) { setSaved(false); notifyWatchlistChange() }
    } else {
      const { error } = await supabase.from('watchlist').insert({ user_id: userId, film_id: filmId })
      if (!error) { setSaved(true); notifyWatchlistChange() }
    }
    setBusy(false)
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      title={saved ? 'Remove from My List' : 'Save to My List'}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ring-1 transition-all disabled:opacity-60 ${
        saved
          ? 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/40'
          : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40'
      } ${className}`}
    >
      <span className="text-base leading-none">{saved ? '✓' : '＋'}</span>
      <span>{saved ? 'Saved' : 'My List'}</span>
    </button>
  )
}
