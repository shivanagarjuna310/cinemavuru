'use client'
// Search / filter / sort wrapper around ContestFilmGrid for /contest/films.
//
// All client-side: the page already loads every approved entry, and a season is
// tens of films, not thousands. Re-querying per keystroke would add latency and
// load for no benefit — and the grid keeps local vote state, so it must not be
// remounted by a refetch.

import { useMemo, useState } from 'react'
import ContestFilmGrid from './ContestFilmGrid'

type Entry = {
  id: string
  film_id: string
  contest_score: number
  created_at: string
  views_since?: number
  films: {
    title_en: string
    title_te: string | null
    genre: string | null
    profiles: { name: string | null } | null
  } | null
}

type Sort = 'votes' | 'views' | 'newest' | 'title'

const SORTS: { key: Sort; label: string }[] = [
  { key: 'votes',  label: 'Top voted' },
  { key: 'views',  label: 'Most viewed' },
  { key: 'newest', label: 'Newest' },
  { key: 'title',  label: 'A–Z' },
]

export default function ContestFilmsBrowser({
  entries,
  contestId,
  isVotingOpen,
}: {
  entries: Entry[]
  contestId: string
  isVotingOpen: boolean
}) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('votes')

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) if (e.films?.genre) set.add(e.films.genre)
    return [...set].sort()
  }, [entries])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = entries.filter((e) => {
      const f = e.films
      if (!f) return false
      if (genre !== 'all' && f.genre !== genre) return false
      if (!q) return true
      // Creator name included: people search for the filmmaker as often as the
      // title, and the grid already shows the name.
      return (
        f.title_en?.toLowerCase().includes(q) ||
        f.title_te?.toLowerCase().includes(q) ||
        f.profiles?.name?.toLowerCase().includes(q) ||
        f.genre?.toLowerCase().includes(q)
      )
    })

    const sorted = [...filtered]
    if (sort === 'votes') sorted.sort((a, b) => (b.contest_score ?? 0) - (a.contest_score ?? 0))
    if (sort === 'views') sorted.sort((a, b) => (b.views_since ?? 0) - (a.views_since ?? 0))
    if (sort === 'newest') sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    if (sort === 'title') {
      sorted.sort((a, b) => (a.films?.title_en ?? '').trim().localeCompare((b.films?.title_en ?? '').trim()))
    }
    return sorted
  }, [entries, query, genre, sort])

  const filtering = query.trim() !== '' || genre !== 'all'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--faint)] text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, filmmakers or genre…"
            aria-label="Search contest films"
            className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[color:var(--text)] placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
          />
        </div>

        {genres.length > 1 && (
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
            className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 text-sm text-[color:var(--text)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
          >
            <option value="all">All genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort films"
          className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 text-sm text-[color:var(--text)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
        >
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <p className="text-xs text-[color:var(--muted)] mb-5" aria-live="polite">
        {filtering
          ? `${shown.length} of ${entries.length} ${entries.length === 1 ? 'film' : 'films'}`
          : `${entries.length} ${entries.length === 1 ? 'film' : 'films'} in the contest`}
        {sort === 'votes' && !isVotingOpen && ' · ranked once voting opens'}
      </p>

      {shown.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[color:var(--border)] rounded-2xl">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[color:var(--text)] font-semibold mb-1">No films match that search</p>
          <p className="text-sm text-[color:var(--muted)] mb-4">Try a different title, filmmaker or genre.</p>
          <button
            onClick={() => { setQuery(''); setGenre('all') }}
            className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#D4A017]/10 transition"
          >
            Clear filters
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
