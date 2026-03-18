'use client'
// src/components/FilmFeed.tsx
// Client component — needs to be interactive for sort tabs.
// When you click a sort tab it updates the URL and the server
// re-fetches films in the right order automatically.

import { useRouter } from 'next/navigation'
import FilmCard from './FilmCard'

type Film = {
  id:           string
  title_en:     string
  title_te:     string | null
  genre:        string | null
  like_count:   number
  view_count:   number
  duration_sec: number | null
  is_top_film:  boolean
  created_at:   string
}

type Props = {
  films:        Film[]
  currentSort:  string
  stateSlug:    string
  districtSlug: string
}

// Genre → visual style mapping
const GENRE_STYLE: Record<string, { emoji: string; gradient: string }> = {
  Drama:       { emoji: '🌾', gradient: 'bg-gradient-to-br from-[#FF6B1A] to-[#F5A623]' },
  Comedy:      { emoji: '🌅', gradient: 'bg-gradient-to-br from-[#8B1A1A] to-[#FF6B1A]' },
  Documentary: { emoji: '🏛️', gradient: 'bg-gradient-to-br from-[#1A1A4E] to-[#8B1A1A]' },
  Thriller:    { emoji: '🌊', gradient: 'bg-gradient-to-br from-[#0A1A2E] to-[#1A4E8B]' },
  Family:      { emoji: '🎭', gradient: 'bg-gradient-to-br from-[#1A1A4E] to-[#FF6B1A]' },
  Default:     { emoji: '🎬', gradient: 'bg-gradient-to-br from-[#1A1208] to-[#2E2010]' },
}

const SORT_TABS = [
  { key: 'recent',   label: 'Recent'      },
  { key: 'liked',    label: 'Most Liked'  },
  { key: 'viewed',   label: 'Most Viewed' },
  { key: 'trending', label: '🔥 Trending' },
]

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtViews(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

export default function FilmFeed({ films, currentSort, stateSlug, districtSlug }: Props) {
  const router = useRouter()

  function handleSort(key: string) {
    router.push(`/${stateSlug}/${districtSlug}?sort=${key}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-20 pt-8">

      {/* Sort bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <p className="text-sm text-[#7A6040]">
          Showing <span className="text-[#D4A017] font-semibold">{films.length}</span> films
        </p>

        <div className="flex gap-1 bg-[#1A1208] border border-[#2E2010] rounded-lg p-1">
          {SORT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleSort(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition ${
                currentSort === tab.key
                  ? 'text-[#D4A017] bg-[#D4A017]/10'
                  : 'text-[#7A6040] hover:text-[#D4A017] hover:bg-[#D4A017]/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {films.length === 0 && (
        <div className="text-center py-24 text-[#7A6040]">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-xl font-semibold mb-2">No films yet</p>
          <p className="text-sm">Be the first filmmaker to upload from this district!</p>
        </div>
      )}

      {/* Film grid */}
      {films.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {films.map(film => {
            const style = GENRE_STYLE[film.genre ?? ''] ?? GENRE_STYLE.Default
            return (
              <FilmCard
                key={film.id}
                id={film.id}
                title={film.title_en}
                titleTe={film.title_te ?? undefined}
                genre={film.genre ?? 'Film'}
                likes={film.like_count ?? 0}
                views={fmtViews(film.view_count ?? 0)}
                emoji={style.emoji}
                gradient={style.gradient}
                duration={film.duration_sec ? fmt(film.duration_sec) : '—'}
                isTop={film.is_top_film ?? false}
                isTrending={film.like_count > 150}
                stateSlug={stateSlug}
                districtSlug={districtSlug}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
