// Horizontal, numbered film carousel used across the homepage (Fresh Off the
// Reel / Most Watched / Most Loved). One component, an accent variant, and a
// metric formatter — replaces three near-identical inline blocks.

import Link from 'next/link'
import FilmPoster from './FilmPoster'

type Accent = 'gold' | 'pink' | 'blue' | 'green'

// Static class strings per accent (Tailwind can't see runtime-built classes)
const ACCENT: Record<Accent, {
  bar: string; text: string; dot: string; hoverText: string; hoverBorder: string
}> = {
  gold: {
    bar: 'bg-[#D4A017]', text: 'text-[color:var(--accent)]', dot: 'bg-[#D4A017]',
    hoverText: 'group-hover:text-[color:var(--accent)]', hoverBorder: 'group-hover:border-[color:var(--accent)]/50',
  },
  pink: {
    bar: 'bg-[#E84393]', text: 'text-[#E84393]', dot: 'bg-[#E84393]',
    hoverText: 'group-hover:text-[#E84393]', hoverBorder: 'group-hover:border-[#E84393]/50',
  },
  blue: {
    bar: 'bg-[#4A90E2]', text: 'text-[#4A90E2]', dot: 'bg-[#4A90E2]',
    hoverText: 'group-hover:text-[#4A90E2]', hoverBorder: 'group-hover:border-[#4A90E2]/50',
  },
  green: {
    bar: 'bg-[#22C55E]', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]',
    hoverText: 'group-hover:text-[#22C55E]', hoverBorder: 'group-hover:border-[#22C55E]/50',
  },
}

function ytId(url?: string) {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1] ?? null
}
function thumb(url?: string) {
  const id = ytId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default function FilmRow({
  films,
  eyebrow,
  title,
  subtitle,
  accent,
  metric,
  showRankBadge = false,
}: {
  films: any[]
  eyebrow: string
  title: string
  subtitle?: string
  accent: Accent
  metric: (f: any) => string
  showRankBadge?: boolean
}) {
  if (!films?.length) return null
  const a = ACCENT[accent]

  return (
    <section className="max-w-6xl mx-auto px-6 pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-px h-6 ${a.bar}`} />
        <span className={`text-xs ${a.text} uppercase tracking-[3px] font-semibold`}>{eyebrow}</span>
        <span className={`w-2 h-2 rounded-full ${a.dot} animate-pulse`} />
      </div>
      <h2 className="text-2xl font-bold text-[color:var(--text)] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
        {title}
      </h2>
      <p className="text-[color:var(--muted)] text-xs mb-6">{subtitle ?? ' '}</p>

      <div className="flex gap-6 overflow-x-auto overflow-y-hidden pt-16 pb-10 -mt-12 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {films.map((film: any, index: number) => {
          const t = thumb(film.video_url)
          const vid = ytId(film.video_url)
          const d = film.districts as any
          const stateSlug = d?.states?.slug ?? 'telangana'
          const districtSlug = d?.slug ?? 'hyderabad'
          return (
            <Link key={film.id} href={`/${stateSlug}/${districtSlug}/film/${film.id}`}
              className="relative flex-shrink-0 w-64 group hover:z-30">
              {showRankBadge && index === 0 && (
                <div className="absolute top-1 right-1 z-30 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow"
                  style={{ background: '#FFD700', color: '#000' }}>🥇</div>
              )}
              {/* Ranked row: the numeral sits in its own fixed-width column to the
                  LEFT of the poster (Netflix "Top 10" style) — fully visible, and
                  the poster tucks over its right edge for a connected look. */}
              <div className="flex items-end">
                <div className="w-16 flex-shrink-0 flex justify-end pr-1 pointer-events-none select-none tabular-nums"
                  style={{
                    fontFamily: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: index + 1 >= 10 ? '4.75rem' : '6.5rem',
                    fontWeight: 900,
                    lineHeight: 0.78,
                    letterSpacing: '-0.05em',
                    color: 'var(--rank-fill)',
                    WebkitTextStroke: '1.5px var(--rank-stroke)',
                  }}>
                  {index + 1}
                </div>
                <div className="relative z-10 -ml-3 flex-1">
                  <FilmPoster vid={vid} thumb={t} title={film.title_en} hoverBorder={a.hoverBorder} />
                </div>
              </div>
              <div className="mt-2 pl-[52px]">
                <p className={`text-[color:var(--text)] text-xs font-bold leading-tight line-clamp-2 ${a.hoverText} transition-colors`}>
                  {film.title_en}
                </p>
                <p className="text-[color:var(--muted)] text-[10px] mt-0.5">{d?.name_en}</p>
                <p className={`${a.text} text-[10px] font-semibold mt-0.5`}>{metric(film)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
