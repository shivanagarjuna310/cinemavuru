// src/app/creator/[id]/page.tsx

import { createClient } from '@supabase/supabase-js'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'
import Navbar           from '@/components/Navbar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GENRE_STYLE: Record<string, { emoji: string; gradient: string }> = {
  Drama:       { emoji: '🌾', gradient: 'from-[#FF6B1A] to-[#F5A623]' },
  Comedy:      { emoji: '🌅', gradient: 'from-[#8B1A1A] to-[#FF6B1A]' },
  Documentary: { emoji: '🏛️', gradient: 'from-[#1A1A4E] to-[#8B1A1A]' },
  Thriller:    { emoji: '🌊', gradient: 'from-[#0A1A2E] to-[#1A4E8B]'  },
  Family:      { emoji: '🎭', gradient: 'from-[#1A1A4E] to-[#FF6B1A]' },
  Default:     { emoji: '🎬', gradient: 'from-[#1A1208] to-[#2E2010]'  },
}

async function getCreator(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, bio, district_id, districts(name_en, slug, states(slug))')
    .eq('id', id)
    .single()

  if (error || !data) return null

  // Use unknown → any to bypass strict nested join inference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any

  return {
    id:          d.id          as string,
    name:        d.name        as string | null,
    bio:         d.bio         as string | null,
    district_id: d.district_id as string | null,
    districtName: (d.districts?.name_en  ?? null) as string | null,
    districtSlug: (d.districts?.slug     ?? 'hyderabad') as string,
    stateSlug:    (d.districts?.states?.slug ?? 'telangana') as string,
  }
}

async function getCreatorFilms(creatorId: string) {
  const { data } = await supabase
    .from('films')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return data ?? []
}

function fmtViews(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [creator, films] = await Promise.all([
    getCreator(id),
    getCreatorFilms(id),
  ])

  if (!creator) notFound()

  const totalViews = films.reduce((s, f) => s + (f.view_count ?? 0), 0)
  const totalLikes = films.reduce((s, f) => s + (f.like_count ?? 0), 0)
  const initial    = (creator.name ?? 'C')[0].toUpperCase()

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
            <span>›</span>
            <Link href={`/${creator.stateSlug}/${creator.districtSlug}`}
              className="hover:text-[#D4A017] transition capitalize">
              {creator.districtSlug}
            </Link>
            <span>›</span>
            <span className="text-[#D4A017]">Filmmaker</span>
          </div>

          {/* Filmmaker card */}
          <div className="flex items-center gap-5 mb-10 pb-8 border-b border-[#2E2010]">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[#FDF6E3] mb-1">
                {creator.name ?? 'Independent Filmmaker'}
              </h1>
              {creator.districtName && (
                <p className="text-sm text-[#FF6B1A] mb-2">
                  📍 {creator.districtName}, Telangana
                </p>
              )}
              {creator.bio && (
                <p className="text-sm text-[#7A6040] leading-relaxed max-w-lg">
                  {creator.bio}
                </p>
              )}
            </div>
            <div className="hidden md:flex gap-6 flex-shrink-0">
              <div className="text-center">
                <div className="text-xl font-bold text-[#D4A017]">{films.length}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Films</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#D4A017]">{fmtViews(totalViews)}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Views</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-[#D4A017]">{totalLikes}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Likes</div>
              </div>
            </div>
          </div>

          {/* Filmography */}
          <h2 className="text-base font-bold text-[#7A6040] uppercase tracking-widest mb-5">
            Filmography
          </h2>

          {films.length === 0 ? (
            <div className="text-center py-16 text-[#7A6040]">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-sm">No films published yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {films.map((film) => {
                const style = GENRE_STYLE[film.genre ?? ''] ?? GENRE_STYLE.Default
                return (
                  <Link
                    key={film.id}
                    href={`/${creator.stateSlug}/${creator.districtSlug}/film/${film.id}`}
                    className="flex items-center gap-4 bg-[#1A1208] border border-[#2E2010] rounded-xl p-4 hover:border-[#D4A017]/30 hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div className={`w-20 h-12 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      {style.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#FDF6E3] text-sm group-hover:text-[#D4A017] transition line-clamp-1">
                        {film.title_en}
                      </h3>
                      {film.title_te && (
                        <p className="text-[10px] text-[#7A6040] mb-0.5">{film.title_te}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[#7A6040]">
                        <span>{film.genre}</span>
                        {film.duration_sec && (
                          <><span>·</span><span>{fmt(film.duration_sec)}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#7A6040] flex-shrink-0">
                      <span>♥ {film.like_count ?? 0}</span>
                      <span>👁 {fmtViews(film.view_count ?? 0)}</span>
                      <span className="text-[#D4A017]">▶</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
