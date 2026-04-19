// src/app/[state]/[district]/film/[id]/page.tsx

import { createClient } from '@supabase/supabase-js'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'
import { headers }      from 'next/headers'
import Navbar           from '@/components/Navbar'
import FilmActions      from '@/components/FilmActions'
import CommentSection   from '@/components/CommentSection'
import type { Metadata } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getFilm(id: string) {
  const { data } = await supabase
    .from('films')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .single()
  return data
}

async function getComments(filmId: string) {
  const { data } = await supabase
    .from('comments')
    .select('*, profiles(name)')
    .eq('film_id', filmId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

// Unique view per IP per day — not per refresh
async function incrementView(filmId: string) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? headersList.get('x-real-ip')
           ?? 'unknown'
    const today = new Date().toISOString().split('T')[0]
    const viewerKey = `${ip}-${today}`

    await supabase.rpc('increment_view', {
  p_film_id:    filmId,
  p_viewer_key: viewerKey,
})
  } catch {
    // Don't let view tracking break the page
  }
}

// ── SEO: generates meta tags for each film page ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; district: string; id: string }>
}): Promise<Metadata> {
  const { id, district } = await params
  const film = await getFilm(id)

  if (!film) {
    return { title: 'Film Not Found — CinemaVuru' }
  }

  const description = film.description
    ? film.description.slice(0, 150) + '...'
    : `Watch "${film.title_en}" — a short film from ${district} on CinemaVuru.`

  const url = `https://www.cinemavuru.com/telangana/${district}/film/${id}`
  const image = film.thumbnail_url ?? 'https://www.cinemavuru.com/og-default.png'

  return {
    title: `${film.title_en} — CinemaVuru`,
    description,
    openGraph: {
      title:       `${film.title_en} — CinemaVuru`,
      description,
      url,
      siteName:    'CinemaVuru',
      type:        'video.other',
      images: [{ url: image, width: 1200, height: 630, alt: film.title_en }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${film.title_en} — CinemaVuru`,
      description,
      images:      [image],
    },
  }
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days} days ago`
  return `${Math.floor(days / 30)} months ago`
}

const GENRE_STYLE: Record<string, { emoji: string; gradient: string }> = {
  Drama:       { emoji: '🌾', gradient: 'from-[#FF6B1A] to-[#F5A623]' },
  Comedy:      { emoji: '🌅', gradient: 'from-[#8B1A1A] to-[#FF6B1A]' },
  Documentary: { emoji: '🏛️', gradient: 'from-[#1A1A4E] to-[#8B1A1A]' },
  Thriller:    { emoji: '🌊', gradient: 'from-[#0A1A2E] to-[#1A4E8B]'  },
  Family:      { emoji: '🎭', gradient: 'from-[#1A1A4E] to-[#FF6B1A]' },
  Default:     { emoji: '🎬', gradient: 'from-[#1A1208] to-[#2E2010]'  },
}

export default async function FilmPage({
  params,
}: {
  params: Promise<{ state: string; district: string; id: string }>
}) {
  const { state: stateSlug, district: districtSlug, id } = await params

  const [film, comments] = await Promise.all([
    getFilm(id),
    getComments(id),
    incrementView(id),  // unique per IP per day
  ])

  if (!film) notFound()

  const style = GENRE_STYLE[film.genre ?? ''] ?? GENRE_STYLE.Default

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
            <span>›</span>
            <Link href={`/${stateSlug}/${districtSlug}`}
              className="hover:text-[#D4A017] transition capitalize">
              {districtSlug}
            </Link>
            <span>›</span>
            <span className="text-[#D4A017] line-clamp-1">{film.title_en}</span>
          </div>

          {/* Video player */}
          <div className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${style.gradient} mb-6 border border-[#2E2010]`}>
            {film.video_url ? (
              <iframe
                src={`${film.video_url}?rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-8xl">{style.emoji}</div>
                <p className="text-[#FDF6E3]/60 text-sm">Video coming soon</p>
              </div>
            )}
          </div>

          {/* Film info */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#FDF6E3] leading-tight mb-1">
                  {film.title_en}
                </h1>
                {film.title_te && (
                  <p className="text-[#7A6040] text-base mb-2">{film.title_te}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-[#7A6040] flex-wrap">
                  <span>{film.genre}</span>
                  <span>·</span>
                  <span>{film.duration_sec ? formatDuration(film.duration_sec) : '—'}</span>
                  <span>·</span>
                  <span>{timeAgo(film.created_at)}</span>
                  <span>·</span>
                  <span className="text-[#FF6B1A] font-semibold capitalize">{districtSlug}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#D4A017]">
                  {film.view_count >= 1000
                    ? `${(film.view_count / 1000).toFixed(1)}K`
                    : film.view_count}
                </div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Views</div>
              </div>
            </div>
          </div>

          {/* Like + Share */}
          <FilmActions
            filmId={film.id}
            initialLikes={film.like_count ?? 0}
            stateSlug={stateSlug}
            districtSlug={districtSlug}
          />

          {/* Description */}
          {film.description && (
            <div className="my-6 p-4 bg-[#1A1208] border border-[#2E2010] rounded-xl">
              <h3 className="text-sm font-bold text-[#D4A017] uppercase tracking-wide mb-2">
                About this film
              </h3>
              <p className="text-[#7A6040] leading-relaxed text-sm">{film.description}</p>
            </div>
          )}

          {/* Comments */}
          <CommentSection filmId={film.id} initialComments={comments} />

        </div>
      </main>
    </>
  )
}
