// src/app/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../components/Navbar'

export const revalidate = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// District image + color overlay config
const DISTRICT_CONFIG: Record<string, { image: string; overlay: string; landmark: string }> = {
  // Telangana
  hyderabad:     { image: '/districts/hyderabad.jpg',     overlay: 'rgba(180,100,0,0.45)',   landmark: 'Charminar' },
  warangal:      { image: '/districts/warangal.jpg',      overlay: 'rgba(0,80,60,0.5)',      landmark: 'Ramappa Temple' },
  karimnagar:    { image: '/districts/karimnagar.jpg',    overlay: 'rgba(80,0,100,0.45)',    landmark: 'Elgandal Fort' },
  nizamabad:     { image: '/districts/nizamabad.jpg',     overlay: 'rgba(0,40,120,0.5)',     landmark: 'Nizamabad Fort' },
  khammam:       { image: '/districts/khammam.jpg',       overlay: 'rgba(140,0,20,0.45)',    landmark: 'Khammam Fort' },
  nalgonda:      { image: '/districts/nalgonda.jpg',      overlay: 'rgba(0,80,120,0.5)',     landmark: 'Nagarjuna Sagar' },
  adilabad:      { image: '/districts/adilabad.png',      overlay: 'rgba(0,60,40,0.45)',     landmark: 'Kuntala Waterfall' },
  mahabubnagar:  { image: '/districts/mahabubnagar.png',  overlay: 'rgba(0,80,100,0.45)',    landmark: 'Jurala Dam' },
  medak:         { image: '/districts/medak.png',         overlay: 'rgba(60,0,80,0.45)',     landmark: 'Medak Cathedral' },
  rangareddy:    { image: '/districts/rangareddy.png',    overlay: 'rgba(0,60,80,0.45)',     landmark: 'Durgam Cheruvu' },
  // Andhra Pradesh
  guntur:        { image: '/districts/guntur.jpg',        overlay: 'rgba(0,100,40,0.45)',    landmark: 'Undavalli Caves' },
  krishna:       { image: '/districts/krishna.png',       overlay: 'rgba(150,20,60,0.45)',   landmark: 'Kanaka Durga Temple' },
  chittoor:      { image: '/districts/chittoor.png',      overlay: 'rgba(160,100,0,0.45)',   landmark: 'Tirumala Temple' },
  visakhapatnam: { image: '/districts/visakhapatnam.jpg', overlay: 'rgba(0,60,140,0.5)',     landmark: 'RK Beach' },
  'east-godavari': { image: '/districts/east-godavari.png', overlay: 'rgba(160,60,0,0.45)', landmark: 'Godavari Ghats' },
  'west-godavari': { image: '/districts/west-godavari.png', overlay: 'rgba(0,100,80,0.45)', landmark: 'Kolleru Lake' },
  kadapa:        { image: '/districts/kadapa.png',        overlay: 'rgba(100,40,0,0.45)',    landmark: 'Gandikota Canyon' },
  kurnool:       { image: '/districts/kurnool.png',       overlay: 'rgba(60,20,80,0.45)',    landmark: 'Belum Caves' },
  anantapur:     { image: '/districts/anantapur.png',     overlay: 'rgba(120,60,0,0.45)',    landmark: 'Lepakshi Temple' },
  nellore:       { image: '/districts/nellore.png',       overlay: 'rgba(0,80,100,0.45)',    landmark: 'Pulicat Lake' },
  prakasam:      { image: '/districts/prakasam.png',      overlay: 'rgba(80,40,0,0.45)',     landmark: 'Sangameswaram Temple' },
  srikakulam:    { image: '/districts/srikakulam.png',    overlay: 'rgba(0,60,60,0.45)',     landmark: 'Arasavalli Sun Temple' },
  vizianagaram:  { image: '/districts/vizianagaram.png',  overlay: 'rgba(80,0,60,0.45)',     landmark: 'Vizianagaram Fort' },
}

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

  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['open', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  const { data: topFilms } = await supabase
    .from('films')
    .select('id, title_en, genre, video_url, view_count, district_id, districts(name_en, slug, states(slug))')
    .eq('status', 'active')
    .order('view_count', { ascending: false })
    .limit(10)

  return {
    topFilms: topFilms ?? [],
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
  const { districts, contest, totalUsers, totalFilms, topFilms } = await getData()

  const telangana = districts.filter(d => d.stateSlug === 'telangana')
  const andhra    = districts.filter(d => d.stateSlug === 'andhra-pradesh')

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen text-[#FDF6E3] bg-[#07080f]">

        {/* ── HERO SECTION ── */}
        <section className="relative min-h-[92vh] flex items-center overflow-hidden">

          {/* Hero background image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/hero-bg.jpg"
              alt="Telugu filmmaker shooting in village"
              fill
              priority
              className="object-cover object-[70%_center] md:object-center"
              sizes="100vw"
            />
            {/* Layered overlays for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080f] via-[#07080f60] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080f] via-transparent to-transparent" />
            {/* Film grain texture */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
              style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
          </div>

          {/* Contest banner */}
          {contest && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-[#D4A017]/20 via-[#D4A017]/10 to-transparent border-b border-[#D4A017]/30 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#FF6B1A] rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D4A017]">
                    🏆 Season {contest.season_number} is LIVE — {contest.title}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex gap-4 text-xs text-[#7A6040]">
                    <span>🥇 ₹{contest.prize_1st?.toLocaleString('en-IN')}</span>
                    <span>🥈 ₹{contest.prize_2nd?.toLocaleString('en-IN')}</span>
                    <span>🥉 ₹{contest.prize_3rd?.toLocaleString('en-IN')}</span>
                  </div>
                  <Link href="/contest"
                    className="bg-[#D4A017] text-black px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide hover:bg-[#FFB830] transition">
                    Enter Now →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Hero content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-12 w-full">
            <div className="max-w-2xl">

              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-px bg-[#FF6B1A]" />
                <span className="text-xs text-[#FF6B1A] uppercase tracking-[4px] font-semibold">
                  Telugu Short Film Platform
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-pulse" />
              </div>

              {/* Main headline */}
              <h1 className="mb-4 leading-[1.05]">
                <span className="block text-5xl md:text-7xl font-black text-white tracking-tight"
                  style={{fontFamily: "'Georgia', 'Times New Roman', serif", textShadow: '0 4px 32px rgba(0,0,0,0.8)'}}>
                  SHOOT.
                </span>
                <span className="block text-5xl md:text-7xl font-black tracking-tight"
                  style={{fontFamily: "'Georgia', 'Times New Roman', serif", textShadow: '0 4px 32px rgba(0,0,0,0.8)', background: 'linear-gradient(135deg, #FF6B1A, #FFB830, #D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                  SHARE.
                </span>
                <span className="block text-5xl md:text-7xl font-black text-white tracking-tight"
                  style={{fontFamily: "'Georgia', 'Times New Roman', serif", textShadow: '0 4px 32px rgba(0,0,0,0.8)'}}>
                  WIN.
                </span>
              </h1>

              {/* Telugu tagline */}
              <p className="text-sm text-[#FFC845] mb-2 tracking-wide"
                style={{fontFamily: "'Noto Sans Telugu', sans-serif"}}>
                మీ ఊరు కథ · ప్రపంచానికి చూపండి
              </p>
              <p className="text-base text-[#F0F0F0] mb-2 font-medium">Your village story. To the world.</p>

              <p className="text-[#D5D5D5] max-w-lg mb-10 leading-relaxed text-base">
                The first hyperlocal short film platform for Telugu filmmakers across
                Telangana & Andhra Pradesh. Upload your film, build your audience,
                compete for real prize money.
              </p>

              {/* CTA Buttons */}
              <div className="flex gap-4 flex-wrap mb-12">
                <Link href="/upload"
                  className="group relative overflow-hidden bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:shadow-2xl hover:shadow-orange-900/50 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="relative z-10">📽️ Upload Free</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                </Link>
                <Link href="/contest"
                  className="border border-[#D4A017]/40 text-[#D4A017] px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:border-[#D4A017] hover:-translate-y-0.5 transition-all duration-300">
                  🏆 Enter Contest
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 flex-wrap">
                {[
                  { num: String(totalFilms || '10+'),  label: 'Short Films' },
                  { num: String(districts.length),     label: 'Districts Live' },
                  { num: '2',                          label: 'Telugu States' },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-4">
                    {i > 0 && <div className="w-px h-8 bg-[#1e2535]" />}
                    <div>
                      <div className="text-2xl font-black text-[#FFC845]"
                        style={{fontFamily: "'Georgia', serif"}}>{s.num}</div>
                      <div className="text-xs text-[#B5B5B5] uppercase tracking-[2px] mt-1 font-medium">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07080f] to-transparent z-10" />
        </section>
        {/* ── TOP 10 FILMS ── */}
        {topFilms.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-px h-6 bg-[#FF6B1A]" />
              <span className="text-xs text-[#FF6B1A] uppercase tracking-[3px] font-semibold">Trending Now</span>
              <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-6"
              style={{fontFamily: "'Georgia', serif"}}>
              🔥 Top 10 This Week
            </h2>

            <div className="flex gap-6 overflow-x-auto pb-4"
              style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              {topFilms.map((film: any, index: number) => {
                const videoId = film.video_url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
                const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
                const districtInfo = film.districts as any
                const stateSlug = districtInfo?.states?.slug ?? 'telangana'
                const districtSlug = districtInfo?.slug ?? 'hyderabad'

                return (
                  <Link
                    key={film.id}
                    href={`/${stateSlug}/${districtSlug}/film/${film.id}`}
                    className="relative flex-shrink-0 w-56 group"
                  >
                    {/* Big number behind card */}
                    <div className="absolute -left-4 bottom-12 text-9xl font-black select-none z-10 leading-none"
                      style={{
                        fontFamily: "'Georgia', serif",
                        color: 'transparent',
                        WebkitTextStroke: '2px rgba(212,160,23,0.5)',
                      }}>
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-lg overflow-hidden ml-5 border border-white/10 group-hover:border-[#D4A017]/50 transition-all duration-300">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={film.title_en}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1A1208] flex items-center justify-center text-2xl">🎬</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    {/* Film info */}
                    <div className="mt-2 ml-5">
                      <p className="text-white text-xs font-bold leading-tight line-clamp-2 group-hover:text-[#FFB830] transition-colors">
                        {film.title_en}
                      </p>
                      <p className="text-[#A5A5A5] text-[10px] mt-0.5">{districtInfo?.name_en}</p>
                      <p className="text-[#FF6B1A] text-[10px] font-semibold mt-0.5">👁 {film.view_count} views</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── HOW IT WORKS ── */}
        <section className="relative max-w-6xl mx-auto px-6 py-20">
          {/* Section header */}
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#D4A017]" />
              <span className="text-xs text-[#D4A017] uppercase tracking-[4px]">Simple Process</span>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#D4A017]" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2"
              style={{fontFamily: "'Georgia', serif"}}>How It Works</h2>
            <p className="text-[#4A5A70] text-sm">మూడు సులభమైన దశలు · Three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🎬',
                title: 'Enter the Contest',
                desc: 'Enter the contest, pay a small season fee, and put your film in the race for prizes. Just uploading? You\'re still welcome — but only contest entries can win.',
                color: 'from-[#FF6B1A]/20 to-transparent',
                border: 'border-[#FF6B1A]/20',
              },
              {
                step: '02',
                icon: '🗳️',
                title: 'Get Votes',
                desc: 'Share your film with friends, family and fans. Every vote counts towards your contest ranking.',
                color: 'from-[#D4A017]/20 to-transparent',
                border: 'border-[#D4A017]/20',
              },
              {
                step: '03',
                icon: '🏆',
                title: 'Win Prizes',
                desc: 'Top 3 contest entries with the most votes (above the season\'s minimum threshold) win real prize money. New season every month.',
                color: 'from-[#4A90E2]/20 to-transparent',
                border: 'border-[#4A90E2]/20',
              },
            ].map(s => (
              <div key={s.step}
                className={`relative bg-gradient-to-br ${s.color} bg-[#0d1020] border ${s.border} rounded-2xl p-8 overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
                <div className="absolute top-4 right-5 text-5xl font-black text-white/5 select-none"
                  style={{fontFamily: "'Georgia', serif"}}>{s.step}</div>
                <div className="text-4xl mb-5">{s.icon}</div>
                <h3 className="font-bold text-white text-lg mb-3">{s.title}</h3>
                <p className="text-[#4A5A70] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TELANGANA DISTRICTS ── */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-px h-5 bg-[#FF6B1A]" />
                <span className="text-xs text-[#FF6B1A] uppercase tracking-[3px] font-semibold">Telangana</span>
              </div>
              <h2 className="text-2xl font-bold text-white"
                style={{fontFamily: "'Georgia', serif"}}>Explore by District</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
            {telangana.map(d => {
              const config = DISTRICT_CONFIG[d.slug] ?? { image: '', overlay: 'rgba(100,60,0,0.5)', landmark: '' }
              return (
                <Link
                  key={d.id}
                  href={`/${d.stateSlug}/${d.slug}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">

                  {/* District image */}
                  {config.image && (
                    <Image
                      src={config.image}
                      alt={d.name_en}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )}

                  {/* Color overlay for variety */}
                  <div className="absolute inset-0 transition-opacity duration-300"
                    style={{background: config.overlay}} />

                  {/* Dark gradient for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Live badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[9px] text-white uppercase tracking-wide font-bold">Live</span>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-bold text-white text-base leading-tight mb-0.5 group-hover:text-[#FFB830] transition-colors">
                      {d.name_en}
                    </h3>
                    <p className="text-white/50 text-[10px] mb-1">{d.name_te}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#D4A017] font-semibold">
                        {d.filmCount} films
                      </span>
                      <span className="text-[9px] text-white/40">{config.landmark}</span>
                    </div>
                  </div>

                  {/* Hover border glow -->*/}
                  <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-[#D4A017]/40 transition-all duration-300" />
                </Link>
              )
            })}
          </div>

          {/* Andhra Pradesh */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-px h-5 bg-[#4A90E2]" />
                <span className="text-xs text-[#4A90E2] uppercase tracking-[3px] font-semibold">Andhra Pradesh</span>
              </div>
              <h2 className="text-2xl font-bold text-white"
                style={{fontFamily: "'Georgia', serif"}}>Andhra Districts</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {andhra.map(d => {
              const config = DISTRICT_CONFIG[d.slug] ?? { image: '', overlay: 'rgba(0,60,120,0.5)', landmark: '' }
              return (
                <Link
                  key={d.id}
                  href={`/${d.stateSlug}/${d.slug}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">

                  {config.image && (
                    <Image
                      src={config.image}
                      alt={d.name_en}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )}

                  <div className="absolute inset-0 transition-opacity duration-300"
                    style={{background: config.overlay}} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#4A90E2] rounded-full animate-pulse" />
                    <span className="text-[9px] text-white uppercase tracking-wide font-bold">Live</span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-bold text-white text-base leading-tight mb-0.5 group-hover:text-[#90C8FF] transition-colors">
                      {d.name_en}
                    </h3>
                    <p className="text-white/50 text-[10px] mb-1">{d.name_te}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#4A90E2] font-semibold">
                        {d.filmCount} films
                      </span>
                      <span className="text-[9px] text-white/40">{config.landmark}</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-[#4A90E2]/40 transition-all duration-300" />
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B1A]/10 via-[#D4A017]/5 to-[#FF6B1A]/10" />
          <div className="absolute inset-0 border-t border-b border-[#D4A017]/20" />
          <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4"
              style={{fontFamily: "'Georgia', serif"}}>
              Ready to Tell Your Story?
            </h2>
            <p className="text-[#D5D5D5] mb-10 max-w-lg mx-auto leading-relaxed">
              Join Telugu filmmakers from across Telangana & Andhra Pradesh sharing their stories with the world.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/upload"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-10 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-2xl shadow-orange-900/40">
                📽️ Upload Free
              </Link>
              <Link href="/contest/enter"
                className="border border-[#D4A017]/40 text-[#D4A017] px-10 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:-translate-y-0.5 transition-all">
                🏆 Enter Contest
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
