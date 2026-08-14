// Horizontal, numbered film carousel used across the homepage (Fresh Off the
// Reel / Most Watched / Most Loved). One component, an accent variant, and a
// metric formatter — replaces three near-identical inline blocks.

import Link from 'next/link'
import Image from 'next/image'

type Accent = 'gold' | 'pink' | 'blue' | 'green'

// Static class strings per accent (Tailwind can't see runtime-built classes)
const ACCENT: Record<Accent, {
  bar: string; text: string; dot: string; hoverText: string; hoverBorder: string; stroke: string
}> = {
  gold: {
    bar: 'bg-[#D4A017]', text: 'text-[color:var(--accent)]', dot: 'bg-[#D4A017]',
    hoverText: 'group-hover:text-[color:var(--accent)]', hoverBorder: 'group-hover:border-[color:var(--accent)]/50',
    stroke: 'rgba(212,160,23,0.5)',
  },
  pink: {
    bar: 'bg-[#E84393]', text: 'text-[#E84393]', dot: 'bg-[#E84393]',
    hoverText: 'group-hover:text-[#E84393]', hoverBorder: 'group-hover:border-[#E84393]/50',
    stroke: 'rgba(232,67,147,0.5)',
  },
  blue: {
    bar: 'bg-[#4A90E2]', text: 'text-[#4A90E2]', dot: 'bg-[#4A90E2]',
    hoverText: 'group-hover:text-[#4A90E2]', hoverBorder: 'group-hover:border-[#4A90E2]/50',
    stroke: 'rgba(74,144,226,0.5)',
  },
  green: {
    bar: 'bg-[#22C55E]', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]',
    hoverText: 'group-hover:text-[#22C55E]', hoverBorder: 'group-hover:border-[#22C55E]/50',
    stroke: 'rgba(34,197,94,0.5)',
  },
}

function thumb(url?: string) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
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

      <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {films.map((film: any, index: number) => {
          const t = thumb(film.video_url)
          const d = film.districts as any
          const stateSlug = d?.states?.slug ?? 'telangana'
          const districtSlug = d?.slug ?? 'hyderabad'
          return (
            <Link key={film.id} href={`/${stateSlug}/${districtSlug}/film/${film.id}`}
              className="relative flex-shrink-0 w-56 group">
              {showRankBadge && index === 0 && (
                <div className="absolute top-0 right-5 z-20 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: '#FFD700', color: '#000' }}>🥇</div>
              )}
              <div className="absolute -left-4 bottom-12 text-9xl font-black select-none z-10 leading-none"
                style={{ fontFamily: "'Georgia', serif", color: 'transparent', WebkitTextStroke: `2px ${a.stroke}` }}>
                {index + 1}
              </div>
              <div className={`relative aspect-video rounded-lg overflow-hidden ml-5 border border-white/10 ${a.hoverBorder} transition-all duration-300`}>
                {t ? (
                  <Image src={t} alt={film.title_en} fill sizes="224px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="mt-2 ml-5">
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
