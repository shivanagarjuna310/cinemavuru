// src/app/page.tsx
// Home page — users pick their district here.
// Films live at /telangana/hyderabad, not on this page.

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getData() {
  // Fetch all districts with their state slug
  const { data: districts } = await supabase
    .from('districts')
    .select('*, states(slug)')
    .order('is_active', { ascending: false })

  // Count active films per district
  const { data: filmRows } = await supabase
    .from('films')
    .select('district_id')
    .eq('status', 'active')

  const counts: Record<string, number> = {}
  filmRows?.forEach(f => {
    counts[f.district_id] = (counts[f.district_id] ?? 0) + 1
  })

  return (districts ?? []).map(d => ({
    ...d,
    stateSlug:  (d.states as { slug: string } | null)?.slug ?? 'telangana',
    filmCount:  counts[d.id] ?? 0,
  }))
}

export default async function Home() {
  const districts      = await getData()
  const active         = districts.filter(d => d.is_active)
  const comingSoon     = districts.filter(d => !d.is_active)
  const totalFilms     = active.reduce((s, d) => s + d.filmCount, 0)

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">

        {/* ── HERO ── */}
        <section className="flex flex-col items-center text-center px-6 py-20">

          <div className="flex items-center gap-2 text-[#D4A017] border border-[#D4A017]/30 bg-[#D4A017]/10 rounded-full px-4 py-1.5 text-xs uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 bg-[#FF6B1A] rounded-full animate-pulse" />
            Now Live: Hyderabad
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-3 leading-tight">
            Your District&apos;s{' '}
            <span className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] bg-clip-text text-transparent">
              Cinema Stage
            </span>
          </h1>

          <p className="text-[#7A6040] text-base mb-2">
            హైదరాబాద్ కథలు · హైదరాబాద్ తెర
          </p>

          <p className="text-[#7A6040] max-w-lg mb-10 leading-relaxed">
            The first hyperlocal short film platform for Telangana.
            Discover films made by filmmakers from your own district.
          </p>

          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/telangana/hyderabad"
              className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-7 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-orange-900/30"
            >
              ▶ Watch Hyderabad Films
            </Link>
            <Link
              href="/upload"
              className="border border-[#D4A017]/40 text-[#D4A017] px-7 py-3 rounded-lg font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition"
            >
              🎬 Upload Your Film
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex gap-12 flex-wrap justify-center">
            {[
              { num: String(totalFilms || 6),   label: 'Short Films' },
              { num: '23',                       label: 'Creators' },
              { num: String(active.length),      label: 'District Live' },
              { num: String(comingSoon.length),  label: 'More Coming' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-[#D4A017]">{s.num}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── DISTRICT GRID ── */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#D4A017] mb-1">Choose Your District</h2>
            <p className="text-[#7A6040] text-sm">తెలంగాణ జిల్లాలు · Telangana Districts</p>
          </div>

          {/* Active districts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {active.map(d => (
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

          {/* Coming soon districts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {comingSoon.map(d => (
              <div
                key={d.id}
                className="bg-[#1A1208]/50 border border-[#2E2010] rounded-xl p-4 opacity-40 cursor-not-allowed relative"
              >
                <span className="absolute top-2 right-2 text-[9px] text-[#7A6040] uppercase tracking-widest">
                  Soon
                </span>
                <h3 className="font-semibold text-sm text-[#7A6040]">{d.name_en}</h3>
                <p className="text-xs text-[#4A3020]">{d.name_te}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  )
}
