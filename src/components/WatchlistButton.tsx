'use client'
// "＋ My List" / "✓ Saved" toggle. My List is account-bound: signed-out users
// are sent to sign in; signed-in users save via Supabase (or a per-user local
// fallback until the watchlist table is migrated).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { type SavedFilm, isSaved, toggleWatchlist, WATCHLIST_EVENT } from '@/lib/watchlist'

export default function WatchlistButton({ film, className = '' }: { film: SavedFilm; className?: string }) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      const s = await isSaved(film.id)
      if (!cancelled) setSaved(s)
    }
    sync()
    window.addEventListener(WATCHLIST_EVENT, sync)
    // Reflect saved state when auth changes (logout clears it)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => sync())
    return () => {
      cancelled = true
      window.removeEventListener(WATCHLIST_EVENT, sync)
      authListener.subscription.unsubscribe()
    }
  }, [film.id])

  async function onClick() {
    if (busy) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setBusy(true)
    setSaved(await toggleWatchlist(film))
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
