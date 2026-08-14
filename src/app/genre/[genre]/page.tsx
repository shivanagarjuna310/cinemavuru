// src/app/genre/[genre]/page.tsx — browse all short films of one genre (live data)
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import type { Metadata } from 'next'

export const revalidate = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const COLS =
  'id, title_en, genre, video_url, view_count, like_count, districts(name_en, slug, states(slug))'

function thumb(url: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

async function getGenreFilms(genre: string) {
  const { data } = await supabase
    .from('films')
    .select(COLS)
    .eq('status', 'active')
    .eq('genre', genre)
    .order('view_count', { ascending: false })
    .limit(60)
  return data ?? []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ genre: string }>
}): Promise<Metadata> {
  const { genre } = await params
  const g = decodeURIComponent(genre)
  return {
    title: `${g} Short Films — CinemaVuru`,
    description: `Watch ${g} short films by local filmmakers from Telangana & Andhra Pradesh on CinemaVuru.`,
  }
}

export default async function GenrePage({
  params,
}: {
  params: Promise<{ genre: string }>
}) {
  const { genre } = await params
  const g = decodeURIComponent(genre)
  const films = await getGenreFilms(g)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-[color:var(--accent)] transition">Home</Link>
            <span>›</span>
            <span className="text-[color:var(--accent)]">Genre</span>
          </div>

          <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-[color:var(--text)]" style={{ fontFamily: "'Georgia', serif" }}>
              {g} <span className="text-[color:var(--accent)]">films</span>
            </h1>
            <span className="text-sm text-[color:var(--muted)]">{films.length} film{films.length === 1 ? '' : 's'}</span>
          </div>

          {films.length === 0 ? (
            <div className="text-center py-24 text-[color:var(--muted)]">
              <div className="text-5xl mb-3">🎬</div>
              <p className="mb-4">No {g} films yet — be the first.</p>
              <Link href="/upload" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm">＋ Share your film</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {films.map((film: any) => {
                const t = thumb(film.video_url)
                const d = Array.isArray(film.districts) ? film.districts[0] : film.districts
                const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
                const stateSlug = s?.slug ?? 'telangana'
                const districtSlug = d?.slug ?? 'hyderabad'
                return (
                  <Link key={film.id} href={`/${stateSlug}/${districtSlug}/film/${film.id}`} className="group">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group-hover:border-[color:var(--accent)]/50 transition-all duration-300">
                      {t ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t} alt={film.title_en} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <p className="text-[color:var(--text)] text-xs font-bold leading-tight line-clamp-2 mt-2 group-hover:text-[color:var(--accent)] transition-colors">
                      {film.title_en}
                    </p>
                    <p className="text-[color:var(--muted)] text-[10px] mt-0.5">{d?.name_en}</p>
                    <p className="text-[color:var(--accent-hot)] text-[10px] font-semibold mt-0.5">👁 {film.view_count} views</p>
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
