// src/app/contest/winners/page.tsx
// Hall of Fame — shows top 3 winners for every past contest season

import { createClient } from '@supabase/supabase-js'
import Link             from 'next/link'
import Navbar           from '@/components/Navbar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getPastContests() {
  const { data } = await supabase
    .from('contests')
    .select(`
      id, title, season_number, ended_at, prize_1st, prize_2nd, prize_3rd,
      winner_film_id,
      winner_2nd_film_id,
      winner_3rd_film_id
    `)
    .eq('status', 'closed')
    .order('season_number', { ascending: false })
  return data ?? []
}

async function getFilmDetails(filmId: string | null) {
  if (!filmId) return null
  const { data } = await supabase
    .from('films')
    .select('id, title_en, title_te, genre, view_count, like_count, district_id, video_url')
    .eq('id', filmId)
    .single()
  return data
}
function getThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null
  const match = videoUrl.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (!match) return null
  return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
}
function formatPrize(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  })
}

export default async function HallOfFamePage() {
  const contests = await getPastContests()

  // Fetch all winner film details in parallel
  const contestsWithFilms = await Promise.all(
    contests.map(async (contest) => {
      const [film1, film2, film3] = await Promise.all([
        getFilmDetails(contest.winner_film_id),
        getFilmDetails(contest.winner_2nd_film_id),
        getFilmDetails(contest.winner_3rd_film_id),
      ])
      return { ...contest, film1, film2, film3 }
    })
  )

  const medals = [
    { key: 'film1', emoji: '🥇', label: '1st Place', color: '#D4A017', bg: 'bg-[#D4A017]/10 border-[#D4A017]/30' },
    { key: 'film2', emoji: '🥈', label: '2nd Place', color: '#9CA3AF', bg: 'bg-[#9CA3AF]/10 border-[#9CA3AF]/30' },
    { key: 'film3', emoji: '🥉', label: '3rd Place', color: '#CD7F32', bg: 'bg-[#CD7F32]/10 border-[#CD7F32]/30' },
  ]

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">

        {/* Header */}
        <div className="bg-gradient-to-b from-[#1A0A00] to-transparent border-b border-[#2E2010]">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-4">
              <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
              <span>›</span>
              <Link href="/contest" className="hover:text-[#D4A017] transition">Contest</Link>
              <span>›</span>
              <span className="text-[#D4A017]">Hall of Fame</span>
            </div>
            <div className="text-5xl mb-4">🏛️</div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#FDF6E3] mb-2">
              Hall of Fame
            </h1>
            <p className="text-[#7A6040] text-sm max-w-xl leading-relaxed">
              The finest short films from Telangana — top 3 winners from every CinemaVuru contest season.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-6 py-10">

          {contestsWithFilms.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-xl font-bold text-[#D4A017] mb-2">No winners yet</h2>
              <p className="text-[#7A6040] text-sm mb-6">
                Winners will appear here once the first contest concludes.
              </p>
              <Link href="/contest"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">
                View Active Contest →
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {contestsWithFilms.map((contest) => (
                <div key={contest.id}>

                  {/* Season header */}
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#D4A017] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                          Season {contest.season_number}
                        </span>
                        {contest.ended_at && (
                          <span className="text-xs text-[#7A6040]">
                            {formatDate(contest.ended_at)}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-[#FDF6E3] mt-2">
                        {contest.title}
                      </h2>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {[
                        { label: '🥇', amount: contest.prize_1st },
                        { label: '🥈', amount: contest.prize_2nd },
                        { label: '🥉', amount: contest.prize_3rd },
                      ].map((p, i) => (
                        <div key={i} className="text-center">
                          <div className="text-[#D4A017] font-bold">{formatPrize(p.amount)}</div>
                          <div className="text-xs text-[#7A6040]">{p.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Winner cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {medals.map((medal) => {
                      const film = contest[medal.key as 'film1' | 'film2' | 'film3']
                      return (
                        <div key={medal.key}
                          className={`border rounded-xl p-5 ${medal.bg}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{medal.emoji}</span>
                            <span className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: medal.color }}>
                              {medal.label}
                            </span>
                          </div>
                          {film ? (
                            <Link href={`/telangana/hyderabad/film/${film.id}`}
                              className="block group">
                              {getThumbnail(film.video_url ?? null) && (
                                <div className="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-[#0D0A06]">
                                  <img
                                    src={getThumbnail(film.video_url ?? null)!}
                                    alt={film.title_en}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}
                              <h3 className="font-bold text-[#FDF6E3] group-hover:text-[#D4A017] transition leading-tight mb-1">
                                {film.title_en}
                              </h3>
                              {film.title_te && (
                                <p className="text-xs text-[#7A6040] mb-3">{film.title_te}</p>
                              )}
                              <div className="flex gap-4 text-xs text-[#7A6040]">
                                {film.genre && <span>{film.genre}</span>}
                                <span>👁 {film.view_count ?? 0}</span>
                                <span>♥ {film.like_count ?? 0}</span>
                              </div>
                              <div className="mt-3 text-xs font-bold uppercase tracking-wide"
                                style={{ color: medal.color }}>
                                Watch Film →
                              </div>
                            </Link>
                          ) : (
                            <p className="text-sm text-[#7A6040] italic">
                              Winner not announced yet
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div className="border-b border-[#2E2010] mt-10" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
