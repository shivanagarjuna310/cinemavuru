'use client'
// First-run personalization: asks a newly signed-in viewer to pick 3+ favourite
// genres, saved to profiles.preferred_genres → powers the "For You" rail.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { PREFS_EVENT } from './ForYouRail'

const GENRES = ['Drama', 'Comedy', 'Thriller', 'Documentary', 'Family', 'Romance', 'RomCom', 'Horror', 'Action', 'Experimental']

export default function OnboardingGenres() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    let alive = true
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles').select('preferred_genres').eq('id', user.id).maybeSingle()
      // Only prompt when the column exists and is empty (avoids nagging on error).
      if (alive && !error && (!data?.preferred_genres || data.preferred_genres.length === 0)) {
        setOpen(true)
      }
    })()
    return () => { alive = false }
  }, [user, loading])

  if (!open) return null

  function toggle(g: string) {
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))
  }

  async function save() {
    if (picked.length < 3 || !user) return
    setSaving(true)
    await supabase.from('profiles').update({ preferred_genres: picked }).eq('id', user.id)
    setSaving(false)
    setOpen(false)
    window.dispatchEvent(new Event(PREFS_EVENT))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-2xl">
        <h2 className="text-2xl font-bold text-[color:var(--text)]" style={{ fontFamily: "'Georgia', serif" }}>
          What do you love to watch?
        </h2>
        <p className="text-[color:var(--muted)] text-sm mt-1.5 mb-5">
          Pick at least 3 genres and we&apos;ll build a <span className="text-[color:var(--accent)] font-semibold">For You</span> row just for you.
        </p>

        <div className="flex flex-wrap gap-2.5 mb-6">
          {GENRES.map((g) => {
            const on = picked.includes(g)
            return (
              <button key={g} onClick={() => toggle(g)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  on
                    ? 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black border-transparent'
                    : 'bg-[color:var(--bg)] text-[color:var(--text)] border-[color:var(--border)] hover:border-[color:var(--accent)]/50'
                }`}>
                {on ? '✓ ' : ''}{g}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setOpen(false)}
            className="text-[color:var(--muted)] text-sm hover:text-[color:var(--text)] transition">
            Maybe later
          </button>
          <button onClick={save} disabled={picked.length < 3 || saving}
            className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide disabled:opacity-50 hover:opacity-90 transition">
            {saving ? 'Saving…' : `Save${picked.length ? ` (${picked.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
