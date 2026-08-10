// src/app/[state]/[district]/page.tsx
// Handles: /telangana/hyderabad  (and any future district)

import { createClient } from '@supabase/supabase-js'
import { notFound }      from 'next/navigation'
import Navbar            from '../../../components/Navbar'
import FilmFeed          from '../../../components/FilmFeed'
export const revalidate = 60
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── fetch district row by slug ─────────────────────────────────
async function getDistrict(districtSlug: string) {
  const { data } = await supabase
    .from('districts')
    .select('*')
    .eq('slug', districtSlug)
    .single()
  return data
}

// ── fetch films for this district, sorted ─────────────────────
async function getFilms(districtId: string, sort: string) {
  let query = supabase
    .from('films')
    .select('*')
    .eq('district_id', districtId)
    .eq('status', 'active')

  if      (sort === 'liked')    query = query.order('like_count',  { ascending: false })
  else if (sort === 'viewed')   query = query.order('view_count',  { ascending: false })
  else if (sort === 'trending') query = query.order('view_count',  { ascending: false })
  else                          query = query.order('created_at',  { ascending: false })

  const { data } = await query
  return data ?? []
}

// ── Page ───────────────────────────────────────────────────────
export default async function DistrictPage({
  params,
  searchParams,
}: {
  params:       Promise<{ state: string; district: string }>
  searchParams: Promise<{ sort?: string }>
}) {
  const { state: stateSlug, district: districtSlug } = await params
  const { sort = 'recent' }                           = await searchParams

  const district = await getDistrict(districtSlug)

  // Unknown district → 404
  if (!district) notFound()

  // Known but not yet active → Coming Soon page
  if (!district.is_active) {
    return (
      <>
        <Navbar />
        <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-6">🎬</div>
            <h1 className="text-3xl font-bold text-[color:var(--accent)] mb-3">
              {district.name_en} — Coming Soon
            </h1>
            <p className="text-[color:var(--muted)] mb-1">{district.name_te}</p>
            <p className="text-[color:var(--muted)] max-w-sm mx-auto leading-relaxed text-sm mt-2">
              We&apos;re bringing CinemaVuru to {district.name_en} soon.
              Be the first filmmaker to upload here!
            </p>
            <a
              href="/"
              className="inline-block mt-8 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition"
            >
              ← Back to Districts
            </a>
          </div>
        </main>
      </>
    )
  }

  const films = await getFilms(district.id, sort)
  //console.log('FIRST FILM video_url:', (films[0] as any)?.video_url)

  // Totals for header stats
  const totalLikes = films.reduce((s, f) => s + (f.like_count ?? 0), 0)
  const totalViews = films.reduce((s, f) => s + (f.view_count ?? 0), 0)

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">

        {/* ── District Header ── */}
        <div className="bg-gradient-to-b from-[color:var(--surface)] to-transparent border-b border-[color:var(--border)]">
          <div className="max-w-6xl mx-auto px-6 py-10">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] uppercase tracking-widest mb-4">
              <a href="/" className="hover:text-[color:var(--accent)] transition">Home</a>
              <span>›</span>
              <span className="capitalize hover:text-[color:var(--accent)] transition">{stateSlug}</span>
              <span>›</span>
              <span className="text-[color:var(--accent)]">{district.name_en}</span>
            </div>

            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <h1 className="text-4xl font-bold text-[color:var(--text)] mb-1">
                  🎬 {district.name_en}
                </h1>
                <p className="text-[color:var(--muted)] text-lg mb-3">{district.name_te}</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
                  <span className="text-[color:var(--accent)] text-sm font-semibold uppercase tracking-wider">
                    Live · {films.length} Short Films
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[color:var(--accent)]">{films.length}</div>
                  <div className="text-xs text-[color:var(--muted)] uppercase tracking-wide">Films</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[color:var(--accent)]">{totalLikes}</div>
                  <div className="text-xs text-[color:var(--muted)] uppercase tracking-wide">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[color:var(--accent)]">
                    {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews}
                  </div>
                  <div className="text-xs text-[color:var(--muted)] uppercase tracking-wide">Views</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Film Feed ── */}
        <FilmFeed
          films={films.map((f: any) => ({ ...f, video_url: f.video_url ?? null }))}
          currentSort={sort}
          stateSlug={stateSlug}
          districtSlug={districtSlug}
        />

      </main>
    </>
  )
}
