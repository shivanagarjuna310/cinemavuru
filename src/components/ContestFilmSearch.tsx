'use client'
// A search box over ContestFilmGrid for /contest/films. Deliberately just the
// box — a previous version added genre pills, a district select, a sort
// control and facet counts, and the page read as cluttered, so it was removed.
//
// Filtering is client-side: the page already loads every approved entry, a
// season is tens of films, and refetching per keystroke would both add latency
// and remount the grid, which holds local vote state.

import { useMemo, useState } from 'react'
import ContestFilmGrid from './ContestFilmGrid'

type Entry = {
  id: string
  film_id: string
  films: {
    title_en: string
    title_te: string | null
    genre: string | null
    profiles: { name: string | null } | { name: string | null }[] | null
  } | null
}

function creatorOf(e: Entry): string | null {
  const p = e.films?.profiles
  return (Array.isArray(p) ? p[0] : p)?.name ?? null
}

export default function ContestFilmSearch({
  entries,
  contestId,
  isVotingOpen,
}: {
  entries: Entry[]
  contestId: string
  isVotingOpen: boolean
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const shown = useMemo(() => {
    if (!q) return entries
    return entries.filter((e) => {
      const f = e.films
      if (!f) return false
      // Telugu title and filmmaker included: on this site people search for
      // both at least as often as the English title.
      return [f.title_en, f.title_te, f.genre, creatorOf(e)]
        .some((v) => v?.toLowerCase().includes(q))
    })
  }, [entries, q])

  return (
    <div>
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--faint)] text-sm">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by film, filmmaker or genre…"
          aria-label="Search contest films"
          className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg pl-9 pr-9 py-2.5 text-sm text-[color:var(--text)] placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--accent)] px-1.5 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {q && (
        <p className="text-xs text-[color:var(--muted)] mb-4" aria-live="polite">
          {shown.length} of {entries.length} films
        </p>
      )}

      {shown.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[color:var(--border)] rounded-2xl">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[color:var(--text)] font-semibold mb-1">No films match “{query.trim()}”</p>
          <p className="text-sm text-[color:var(--muted)] mb-4">Try a different title, filmmaker or genre.</p>
          <button
            onClick={() => setQuery('')}
            className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#D4A017]/10 transition"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ContestFilmGrid
          entries={shown as never[]}
          contestId={contestId}
          isVotingOpen={isVotingOpen}
        />
      )}
    </div>
  )
}
