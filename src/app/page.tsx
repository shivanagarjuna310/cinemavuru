// src/app/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Navbar from '../components/Navbar'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getData() {
  const { data: districts } = await supabase
    .from('districts')
    .select('*, states(slug, name_en)')
    .eq('is_active', true)
    .order('name_en', { ascending: true })

  const { data: filmRows } = await supabase
    .from('films')
    .select('district_id')
    .eq('status', 'active')

  const counts: Record<string, number> = {}
  filmRows?.forEach(f => {
    counts[f.district_id] = (counts[f.district_id] ?? 0) + 1
  })

  // Fetch active contest
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['open', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch total stats
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  return {
    districts: (districts ?? []).map(d => ({
      ...d,
      stateSlug: (d.states as { slug: string; name_en: string } | null)?.slug ?? 'telangana',
      stateName: (d.states as { slug: string; name_en: string } | null)?.name_en ?? 'Telangana',
      filmCount: counts[d.id] ?? 0,
    })),
    contest,
    totalUsers: totalUsers ?? 0,
    totalFilms: filmRows?.length ?? 0,
  }
}

export default async function Home() {
  const { districts, contest, totalUsers, totalFilms } = await getData()

  const telangana = districts.filter(d => d.stateSlug === 'telangana')
  const andhra    = districts.filter(d => d.stateSlug === 'andhra-pradesh')

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">

        {/* ── ACTIVE CONTEST BANNER ── */}
        {contest && (
          <div className="bg-gradient-to-r from-[#1A0A00] to-[#0D0A06] border-b border-[#D4A017]/30">
            <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4A017]">
                  🏆 Season {contest.season_number} is LIVE
                </span>
                <span className="text-xs text-[#7A6040] hidden sm:block">—</span>
                <span className="text-xs text-[#7A6040] hidden sm:block">{contest.title}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-3 text-xs text-[#7A6040]">
                  <span>🥇 ₹{contest.prize_1st?.toLocaleString('en-IN')}</span>
                  <span>🥈 ₹{contest.prize_2nd?.toLocaleString('en-IN')}</span>
                  <span>🥉 ₹{contest.prize_3rd?.toLocaleString('en-IN')}</span>
                </div>
                <Link href="/contest"
                  className="bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#D4A017] px-3 py-1 rounded text-xs font-bold uppercase tracking-wide hover:bg-[#D4A017]/30 transition">
                  Enter Now →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── HERO ── */}
        <section className="flex flex-col items-center text-center px-6 py-20">

          <div className="flex items-center gap-2 text-[#D4A017] border border-[#D4A017]/30 bg-[#D4A017]/10 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 bg-[#FF6B1A] rounded-full animate-pulse" />
            Telugu Short Film Platform
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-3 leading-tight">
            Submit. Get Votes.{' '}
            <span className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] bg-clip-text text-transparent">
              Win Prizes.
            </span>
          </h1>

          <p className="text-[#7A6040] text-base mb-2">
            తెలుగు సినిమా వేదిక · Telugu Cinema Stage
          </p>

          <p className="text-[#7A6040] max-w-lg mb-10 leading-relaxed">
            The first hyperlocal short film platform for Telugu filmmakers.
            Upload your film, build your audience, compete for prize money.
          </p>

          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/upload"
              className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-7 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-orange-900/30"
            >
              🎬 Submit Your Film
            </Link>
            <Link
              href="/contest"
              className="border border-[#D4A017]/40 text-[#D4A017] px-7 py-3 rounded-lg font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition"
            >
              🏆 View Contest
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex gap-12 flex-wrap justify-center">
            {[
              { num: String(totalFilms || '10+'),  label: 'Short Films'   },
              { num: String(totalUsers || '20+'),  label: 'Filmmakers'    },
              { num: String(districts.length),     label: 'Districts Live' },
              { num: '2',                          label: 'Telugu States'  },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-[#D4A017]">{s.num}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#D4A017] mb-1">How It Works</h2>
            <p className="text-[#7A6040] text-sm">మూడు సులభమైన దశలు · Three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🎬',
                title: 'Upload Your Film',
                desc: 'Submit your short film with a YouTube link. Our team reviews and approves it within 24 hours.',
              },
              {
                step: '02',
                icon: '🗳️',
                title: 'Get Votes',
                desc: 'Share your film with friends, family and fans. Every vote counts towards your contest ranking.',
              },
              {
                step: '03',
                icon: '🏆',
                title: 'Win Prizes',
                desc: 'Top 3 films with the most votes win real prize money. New season every month.',
              },
            ].map(s => (
              <div key={s.step} className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-4xl font-black text-[#2E2010]">{s.step}</div>
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-[#FDF6E3] mb-2">{s.title}</h3>
                <p className="text-[#7A6040] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DISTRICT GRID ── */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#D4A017] mb-1">Choose Your District</h2>
            <p className="text-[#7A6040] text-sm">తెలుగు జిల్లాలు · Telugu Districts</p>
          </div>

          {/* Telangana */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B1A]">Telangana</span>
              <div className="flex-1 h-px bg-[#2E2010]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {telangana.map(d => (
                <Link
                  key={d.id}
                  href={`/${d.stateSlug}/${d.slug}`}
                  className="bg-[#1A1208] border border-[#D4A017]/40 rounded-xl p-5 hover:border-[#D4A017] hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
                    <span className="text-[10px] text-[#D4A017] uppercase tracking-widest font-bold bg-[#D4A017]/10 px-2 py-0.5 rounded">
                      Live
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[#FDF6E3] group-hover:text-[#D4A017] transition mb-1">
                    {d.name_en}
                  </h3>
                  <p className="text-sm text-[#7A6040] mb-3">{d.name_te}</p>
                  <p className="text-xs text-[#D4A017] font-semibold">
                    {d.filmCount} short films →
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Andhra Pradesh */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B1A]">Andhra Pradesh</span>
              <div className="flex-1 h-px bg-[#2E2010]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {andhra.map(d => (
                <Link
                  key={d.id}
                  href={`/${d.stateSlug}/${d.slug}`}
                  className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-5 hover:border-[#D4A017]/60 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-2 h-2 bg-[#D4A017] rounded-full animate-pulse" />
                    <span className="text-[10px] text-[#7A6040] uppercase tracking-widest font-bold bg-[#2E2010] px-2 py-0.5 rounded">
                      Live
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-[#FDF6E3] group-hover:text-[#D4A017] transition mb-1">
                    {d.name_en}
                  </h3>
                  <p className="text-sm text-[#7A6040] mb-3">{d.name_te}</p>
                  <p className="text-xs text-[#7A6040] font-semibold">
                    {d.filmCount} short films →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </main>
    </>
  )
}