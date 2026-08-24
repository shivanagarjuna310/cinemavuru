// Film of the Day card — server component (no client JS except the countdown).
//
// Answers "why would I come back tomorrow?": one hand-of-fate pick that changes
// at midnight IST and walks the entire library, so the homepage is never
// identical twice and every creator eventually gets the top slot.

import Link from 'next/link'
import Image from 'next/image'
import { pickOfTheDay } from '@/lib/filmOfTheDay'
import NextPickCountdown from './NextPickCountdown'
import { ytIdFromUrl } from '@/lib/youtube'

export type PickFilm = {
  id: string
  title_en: string
  title_te: string | null
  description: string | null
  genre: string | null
  video_url: string | null
  view_count: number | null
  like_count: number | null
  districts: { name_en?: string; slug?: string; states?: { slug?: string } | { slug?: string }[] } | null
                | { name_en?: string; slug?: string; states?: { slug?: string } | { slug?: string }[] }[]
}

function loc(f: PickFilm) {
  const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  return {
    districtName: d?.name_en ?? '',
    href: `/${s?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${f.id}`,
  }
}

export default function FilmOfTheDay({ films }: { films: PickFilm[] }) {
  const film = pickOfTheDay(films)
  if (!film) return null

  const { districtName, href } = loc(film)
  const ytId = ytIdFromUrl(film.video_url)
  // hqdefault always exists; maxresdefault 404s on plenty of uploads.
  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] px-2.5 py-1 rounded">
            Film of the Day
          </span>
          <span className="text-[color:var(--muted)] text-xs hidden sm:inline">
            A new pick every midnight
          </span>
        </div>
        <NextPickCountdown />
      </div>

      <Link
        href={href}
        className="group block rounded-2xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row">
          {thumb && (
            <div className="relative w-full sm:w-[300px] md:w-[360px] aspect-video shrink-0 overflow-hidden bg-black">
              <Image
                src={thumb}
                alt={film.title_en}
                fill
                sizes="(max-width: 640px) 100vw, 360px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-0 grid place-items-center">
                <span className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-sm grid place-items-center ring-1 ring-white/25">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </div>
          )}

          <div className="p-5 sm:p-6 flex flex-col justify-center min-w-0">
            <h3
              className="text-xl sm:text-2xl font-black text-[color:var(--text)] leading-tight mb-1"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {film.title_en}
            </h3>

            {film.title_te && (
              <p
                className="text-[color:var(--accent)] text-sm mb-2"
                style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
              >
                {film.title_te}
              </p>
            )}

            {film.description && (
              <p className="text-[color:var(--muted)] text-sm leading-relaxed mb-3 line-clamp-2">
                {film.description}
              </p>
            )}

            <div className="flex items-center gap-2.5 flex-wrap text-xs text-[color:var(--muted)]">
              {film.genre && (
                <span className="px-2 py-0.5 rounded border border-[color:var(--border)]">{film.genre}</span>
              )}
              {districtName && <span>📍 {districtName}</span>}
              <span>👁 {film.view_count ?? 0}</span>
              <span>❤️ {film.like_count ?? 0}</span>
            </div>

            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--accent)]">
              Watch today&apos;s pick
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
