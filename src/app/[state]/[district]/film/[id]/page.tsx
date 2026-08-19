// src/app/[state]/[district]/film/[id]/page.tsx

import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import Link             from 'next/link'
import { headers }      from 'next/headers'
import Navbar           from '@/components/Navbar'
import FilmActions      from '@/components/FilmActions'
import FilmPlayer       from '@/components/FilmPlayer'
import CommentSection   from '@/components/CommentSection'
import FilmRow          from '@/components/FilmRow'
import WatchlistButton  from '@/components/WatchlistButton'
import FollowButton     from '@/components/FollowButton'
import type { Metadata } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

async function getFilm(id: string) {
  const { data } = await supabase
    .from('films')
    .select('*, profiles!films_creator_id_fkey(id, name), districts(slug, name_en, states(slug))')
    .eq('id', id)
    .eq('status', 'active')
    .single()
  return data
}

const RELATED_COLS =
  'id, title_en, genre, video_url, view_count, like_count, district_id, districts(name_en, slug, states(slug))'

// "More to watch" — same district first (hyperlocal), fall back to trending.
async function getMoreToWatch(districtId: string, excludeId: string) {
  const { data: same } = await supabase
    .from('films').select(RELATED_COLS)
    .eq('status', 'active').eq('district_id', districtId).neq('id', excludeId)
    .order('view_count', { ascending: false }).limit(12)
  if (same && same.length > 0) return { films: same, fromDistrict: true }

  const { data: trending } = await supabase
    .from('films').select(RELATED_COLS)
    .eq('status', 'active').neq('id', excludeId)
    .order('view_count', { ascending: false }).limit(12)
  return { films: trending ?? [], fromDistrict: false }
}

// "More like this" — same genre, excluding films already shown elsewhere.
async function getMoreLikeThis(genre: string | null, excludeIds: string[]) {
  if (!genre) return []
  const { data } = await supabase
    .from('films').select(RELATED_COLS)
    .eq('status', 'active').eq('genre', genre)
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .order('view_count', { ascending: false }).limit(12)
  return data ?? []
}

// Build the autoplay-next payload from the top "more to watch" pick.
function nextFilmFrom(f: any, fallbackState: string, fallbackDistrict: string) {
  if (!f) return null
  const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  const vid = f.video_url?.match(/embed\/([^?]+)/)?.[1]
  return {
    href: `/${s?.slug ?? fallbackState}/${d?.slug ?? fallbackDistrict}/film/${f.id}`,
    title: f.title_en as string,
    thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null,
  }
}

// Supabase may return a to-one relation as an object or a 1-element array —
// normalise so canonical URL + redirect work regardless of shape.
function filmLocation(film: any): { state?: string; district?: string } {
  const d = Array.isArray(film?.districts) ? film.districts[0] : film?.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  return { state: s?.slug, district: d?.slug }
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

// Real like count straight from the likes table (not the denormalised column)
async function getLikeCount(filmId: string) {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('film_id', filmId)
  return count ?? 0
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
  const { id, state, district } = await params
  const film = await getFilm(id)

  if (!film) {
    return { title: 'Film Not Found — CinemaVuru' }
  }

  // Canonical points at the film's real district (a film is reachable under any
  // /state/district, so pin one canonical URL to avoid duplicate content).
  const loc = filmLocation(film)
  const realState = loc.state ?? state ?? 'telangana'
  const realDistrict = loc.district ?? district

  const description = film.description
    ? film.description.slice(0, 150) + '...'
    : `Watch "${film.title_en}" — a short film from ${realDistrict} on CinemaVuru.`

  const url = `${SITE}/${realState}/${realDistrict}/film/${id}`

  // Note: no explicit images here — the branded card is supplied by the
  // colocated opengraph-image.tsx (removing this lets that take over).
  return {
    title: `${film.title_en} — CinemaVuru`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title:       `${film.title_en} — CinemaVuru`,
      description,
      url,
      siteName:    'CinemaVuru',
      type:        'video.other',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${film.title_en} — CinemaVuru`,
      description,
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
  Default:     { emoji: '🎬', gradient: 'from-[color:var(--surface)] to-[color:var(--border)]'  },
}

export default async function FilmPage({
  params,
}: {
  params: Promise<{ state: string; district: string; id: string }>
}) {
  const { state: stateSlug, district: districtSlug, id } = await params

  const [film, comments, , likeCount] = await Promise.all([
    getFilm(id),
    getComments(id),
    incrementView(id),  // unique per IP per day
    getLikeCount(id),
  ])

  if (!film) notFound()

  // Redirect to the canonical district URL if the film is opened under a
  // different /state/district than where it actually belongs.
  const loc = filmLocation(film)
  if (loc.state && loc.district && (loc.state !== stateSlug || loc.district !== districtSlug)) {
    redirect(`/${loc.state}/${loc.district}/film/${id}`)
  }

  const style = GENRE_STYLE[film.genre ?? ''] ?? GENRE_STYLE.Default

  const drel: any = Array.isArray((film as any).districts) ? (film as any).districts[0] : (film as any).districts
  const districtName: string = drel?.name_en ?? districtSlug
  const { films: moreToWatch, fromDistrict } = await getMoreToWatch(film.district_id, film.id)
  const moreLikeThis = await getMoreLikeThis(film.genre ?? null, [film.id, ...moreToWatch.map((f: any) => f.id)])
  const nextFilm = nextFilmFrom(moreToWatch[0] ?? moreLikeThis[0], stateSlug, districtSlug)

  // SEO: VideoObject structured data so films can surface in Google video results
  const videoId = film.video_url?.match(/embed\/([^?]+)/)?.[1]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: film.title_en,
    description: film.description || `A short film from ${districtSlug} on CinemaVuru.`,
    thumbnailUrl: videoId ? [`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`] : undefined,
    uploadDate: film.created_at,
    embedUrl: film.video_url || undefined,
    contentUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-[color:var(--accent)] transition">Home</Link>
            <span>›</span>
            <Link href={`/${stateSlug}/${districtSlug}`}
              className="hover:text-[color:var(--accent)] transition capitalize">
              {districtSlug}
            </Link>
            <span>›</span>
            <span className="text-[color:var(--accent)] line-clamp-1">{film.title_en}</span>
          </div>

          {/* Video player (metered soft wall for anonymous viewers) */}
          <div className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${style.gradient} mb-6 border border-[color:var(--border)]`}>
            <FilmPlayer videoUrl={film.video_url} filmId={film.id} emoji={style.emoji} nextFilm={nextFilm} />
          </div>

          {/* Film info */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)] leading-tight mb-1">
                  {film.title_en}
                </h1>
                {film.title_te && (
                  <p className="text-[color:var(--muted)] text-base mb-2">{film.title_te}</p>
                )}
                <div className="flex items-center gap-3 text-sm text-[color:var(--muted)] flex-wrap">
                  {(film as any).profiles?.name && (
                    <>
                      <Link href={`/creator/${(film as any).profiles.id}`}
                        className="text-[color:var(--accent)] hover:underline font-semibold">
                        {(film as any).profiles.name}
                      </Link>
                      <span>·</span>
                    </>
                  )}
                  <span>{film.genre}</span>
                  <span>·</span>
                  <span>{film.duration_sec ? formatDuration(film.duration_sec) : '—'}</span>
                  <span>·</span>
                  <span>{timeAgo(film.created_at)}</span>
                  <span>·</span>
                  <span className="text-[color:var(--accent-hot)] font-semibold capitalize">{districtSlug}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-[color:var(--accent)]">
                    {film.view_count >= 1000
                      ? `${(film.view_count / 1000).toFixed(1)}K`
                      : film.view_count}
                  </div>
                  <div className="text-xs text-[color:var(--muted)] uppercase tracking-wide">Views</div>
                </div>
                <WatchlistButton filmId={film.id} />
                {(film as any).profiles?.id && (
                  <FollowButton creatorId={(film as any).profiles.id} size="sm" />
                )}
              </div>
            </div>
          </div>

          {/* Like + Share */}
          <FilmActions
            filmId={film.id}
            initialLikes={likeCount}
            stateSlug={stateSlug}
            districtSlug={districtSlug}
          />

          {/* Description */}
          {film.description && (
            <div className="my-6 p-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl">
              <h3 className="text-sm font-bold text-[color:var(--accent)] uppercase tracking-wide mb-2">
                About this film
              </h3>
              <p className="text-[color:var(--muted)] leading-relaxed text-sm">{film.description}</p>
            </div>
          )}

          {/* Comments */}
          <CommentSection filmId={film.id} initialComments={comments} />

        </div>

        {/* More like this — same genre */}
        {moreLikeThis.length > 0 && (
          <FilmRow
            films={moreLikeThis}
            eyebrow={film.genre ? `${film.genre} films` : 'You might like'}
            title="🎯 More like this"
            accent="pink"
            metric={(f) => `👁 ${f.view_count} views`}
          />
        )}

        {/* More to watch — keep the binge going */}
        {moreToWatch.length > 0 && (
          <FilmRow
            films={moreToWatch}
            eyebrow={fromDistrict ? `More from ${districtName}` : 'Trending now'}
            title="🎬 More to watch"
            accent="gold"
            metric={(f) => `👁 ${f.view_count} views`}
          />
        )}
      </main>
    </>
  )
}
