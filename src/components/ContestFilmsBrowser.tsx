'use client'
// Search / filter / sort wrapper around ContestFilmGrid for /contest/films.
//
// All client-side: the page already loads every approved entry, and a season is
// tens of films, not thousands. Re-querying per keystroke would add latency and
// load for no benefit — and the grid keeps local vote state, so it must not be
// remounted by a refetch.

import { useMemo, useState } from 'react'
import ContestFilmGrid from './ContestFilmGrid'

type StateRel = { slug: string | null; name_en: string | null }
type DistrictRel = {
  name_en: string | null
  slug: string | null
  states: StateRel | StateRel[] | null
}

type Entry = {
  id: string
  film_id: string
  contest_score: number
  created_at: string
  views_since?: number
  likes_since?: number
  films: {
    title_en: string
    title_te: string | null
    genre: string | null
    districts: DistrictRel | DistrictRel[] | null
    profiles: { name: string | null } | { name: string | null }[] | null
  } | null
}

type Sort = 'votes' | 'views' | 'likes' | 'newest' | 'title'

const ALL = 'all'

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}
function districtOf(e: Entry) { return one(e.films?.districts) }
function stateOf(e: Entry) { return one(districtOf(e)?.states) }
function creatorOf(e: Entry) { return one(e.films?.profiles)?.name ?? null }

function matchesQuery(e: Entry, q: string): boolean {
  if (!q) return true
  const f = e.films
  if (!f) return false
  return [f.title_en, f.title_te, f.genre, creatorOf(e), districtOf(e)?.name_en]
    .some((v) => v?.toLowerCase().includes(q))
}

/**
 * Counts for one facet, computed with every OTHER filter already applied — so a
 * number tells you what you would actually get, not what exists in the
 * abstract, and options that would return nothing never appear.
 */
function facetCounts(entries: Entry[], key: (e: Entry) => string | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of entries) {
    const k = key(e)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

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
  const [genre, setGenre] = useState(ALL)
  const [state, setState] = useState(ALL)
  const [district, setDistrict] = useState(ALL)
  // Every contest_score is 0 until voting opens, so ranking by votes before
  // then is an arbitrary order presented as though it were a leaderboard.
  const [sort, setSort] = useState<Sort>(isVotingOpen ? 'votes' : 'newest')

  const q = query.trim().toLowerCase()

  const base = useMemo(() => entries.filter((e) => matchesQuery(e, q)), [entries, q])

  const stateCounts = useMemo(
    () => facetCounts(
      base.filter((e) => genre === ALL || e.films?.genre === genre),
      (e) => stateOf(e)?.name_en ?? null,
    ),
    [base, genre],
  )
  const districtCounts = useMemo(
    () => facetCounts(
      base.filter((e) =>
        (genre === ALL || e.films?.genre === genre) &&
        (state === ALL || stateOf(e)?.name_en === state)),
      (e) => districtOf(e)?.name_en ?? null,
    ),
    [base, genre, state],
  )
  const genreCounts = useMemo(
    () => facetCounts(
      base.filter((e) =>
        (state === ALL || stateOf(e)?.name_en === state) &&
        (district === ALL || districtOf(e)?.name_en === district)),
      (e) => e.films?.genre ?? null,
    ),
    [base, state, district],
  )

  const shown = useMemo(() => {
    const filtered = base.filter((e) =>
      (genre === ALL || e.films?.genre === genre) &&
      (state === ALL || stateOf(e)?.name_en === state) &&
      (district === ALL || districtOf(e)?.name_en === district))

    const sorted = [...filtered]
    if (sort === 'votes') sorted.sort((a, b) => (b.contest_score ?? 0) - (a.contest_score ?? 0))
    if (sort === 'views') sorted.sort((a, b) => (b.views_since ?? 0) - (a.views_since ?? 0))
    if (sort === 'likes') sorted.sort((a, b) => (b.likes_since ?? 0) - (a.likes_since ?? 0))
    if (sort === 'newest') sorted.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    if (sort === 'title') {
      sorted.sort((a, b) =>
        (a.films?.title_en ?? '').trim().localeCompare((b.films?.title_en ?? '').trim()))
    }
    return sorted
  }, [base, genre, state, district, sort])

  const active: { label: string; clear: () => void }[] = []
  if (q) active.push({ label: query.trim(), clear: () => setQuery('') })
  if (state !== ALL) active.push({ label: state, clear: () => { setState(ALL); setDistrict(ALL) } })
  if (district !== ALL) active.push({ label: district, clear: () => setDistrict(ALL) })
  if (genre !== ALL) active.push({ label: genre, clear: () => setGenre(ALL) })

  function clearAll() {
    setQuery('')
    setGenre(ALL)
    setState(ALL)
    setDistrict(ALL)
  }

  const pill = (on: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-bold transition border ${
      on
        ? 'bg-[#D4A017]/15 text-[color:var(--accent)] border-[color:var(--accent)]/50'
        : 'bg-[color:var(--surface)] text-[color:var(--muted)] border-[color:var(--border)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)]/40'
    }`
  const selectCls =
    'bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-2.5 text-sm text-[color:var(--text)] focus:outline-none focus:border-[color:var(--accent)]/50 transition'

  return (
    <div>
      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--faint)] text-sm">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search film, filmmaker, district or genre…"
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

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort films"
          className={selectCls}
        >
          {isVotingOpen && <option value="votes">Most votes</option>}
          <option value="views">Most watched</option>
          <option value="likes">Most liked</option>
          <option value="newest">Newest first</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      {/* Where */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[2px] text-[color:var(--faint)] mr-1">Where</span>
        <button onClick={() => { setState(ALL); setDistrict(ALL) }} className={pill(state === ALL)}>
          All states
        </button>
        {[...stateCounts.entries()].sort().map(([name, n]) => (
          <button key={name} onClick={() => { setState(name); setDistrict(ALL) }} className={pill(state === name)}>
            {name} <span className="opacity-60">{n}</span>
          </button>
        ))}
        {districtCounts.size > 1 && (
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label="Filter by district"
            className={`${selectCls} py-1.5 text-xs`}
          >
            <option value={ALL}>All districts</option>
            {[...districtCounts.entries()].sort().map(([name, n]) => (
              <option key={name} value={name}>{name} ({n})</option>
            ))}
          </select>
        )}
      </div>

      {/* Genre */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-[2px] text-[color:var(--faint)] mr-1">Genre</span>
        <button onClick={() => setGenre(ALL)} className={pill(genre === ALL)}>All</button>
        {[...genreCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => (
          <button key={name} onClick={() => setGenre(name)} className={pill(genre === name)}>
            {name} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {/* Result count + active filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5" aria-live="polite">
        <span className="text-xs text-[color:var(--muted)]">
          {active.length
            ? `${shown.length} of ${entries.length} films`
            : `${entries.length} ${entries.length === 1 ? 'film' : 'films'} in the contest`}
        </span>
        {active.map((a) => (
          <button
            key={a.label}
            onClick={a.clear}
            className="inline-flex items-center gap-1 text-xs bg-[#D4A017]/10 text-[color:var(--accent)] border border-[color:var(--accent)]/30 rounded-full px-2.5 py-1 hover:bg-[#D4A017]/20 transition"
          >
            {a.label} <span className="opacity-70">✕</span>
          </button>
        ))}
        {active.length > 1 && (
          <button
            onClick={clearAll}
            className="text-xs text-[color:var(--muted)] underline hover:text-[color:var(--accent)]"
          >
            Clear all
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[color:var(--border)] rounded-2xl">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[color:var(--text)] font-semibold mb-1">No films match these filters</p>
          <p className="text-sm text-[color:var(--muted)] mb-4">Try a different district, genre or search term.</p>
          <button
            onClick={clearAll}
            className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#D4A017]/10 transition"
          >
            Clear all filters
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
