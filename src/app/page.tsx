// src/app/page.tsx
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../components/Navbar'
import Reveal from '../components/Reveal'
import CountUp from '../components/CountUp'
import FilmRow from '../components/FilmRow'
import MyListRail from '../components/MyListRail'

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

const FILM_COLS =
  'id, title_en, genre, video_url, view_count, like_count, district_id, districts(name_en, slug, states(slug))'

async function getData() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
  const monthName = now.toLocaleString('en-IN', { month: 'long' })

  // Run all independent queries concurrently (was sequential → slow TTFB)
  const [districtsRes, filmRowsRes, topFilmsRes, mostLikedRes, monthlyFilmsRes, recentFilmsRes] = await Promise.all([
    supabase.from('districts').select('*, states(slug, name_en)').eq('is_active', true).order('name_en', { ascending: true }),
    supabase.from('films').select('district_id, genre').eq('status', 'active'),
    supabase.from('films').select(FILM_COLS).eq('status', 'active').order('view_count', { ascending: false }).limit(10),
    supabase.from('films').select(FILM_COLS).eq('status', 'active').order('like_count', { ascending: false }).limit(10),
    supabase.from('films').select(FILM_COLS).eq('status', 'active').gte('created_at', monthStart).lte('created_at', monthEnd).order('view_count', { ascending: false }).limit(10),
    supabase.from('films').select(FILM_COLS).eq('status', 'active').order('created_at', { ascending: false }).limit(10),
  ])

  const districts = districtsRes.data
  const filmRows = filmRowsRes.data

  const counts: Record<string, number> = {}
  const genreCounts: Record<string, number> = {}
  filmRows?.forEach(f => {
    counts[f.district_id] = (counts[f.district_id] ?? 0) + 1
    if (f.genre) genreCounts[f.genre] = (genreCounts[f.genre] ?? 0) + 1
  })
  const genres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }))

  return {
    topFilms: topFilmsRes.data ?? [],
    mostLiked: mostLikedRes.data ?? [],
    monthlyFilms: monthlyFilmsRes.data ?? [],
    genres,
    recentFilms: recentFilmsRes.data ?? [],
    monthName,
    districts: (districts ?? []).map(d => ({
      ...d,
      stateSlug: (d.states as { slug: string; name_en: string } | null)?.slug ?? 'telangana',
      stateName: (d.states as { slug: string; name_en: string } | null)?.name_en ?? 'Telangana',
      filmCount: counts[d.id] ?? 0,
    })),
    totalFilms: filmRows?.length ?? 0,
  }
}

export default async function Home() {
  const { districts, totalFilms, topFilms, mostLiked, monthlyFilms, genres, recentFilms, monthName } = await getData()

  const telangana = districts.filter(d => d.stateSlug === 'telangana')
  const andhra    = districts.filter(d => d.stateSlug === 'andhra-pradesh')

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen text-[color:var(--text)] bg-[color:var(--bg)] overflow-x-hidden">

        {/* ══════════ HERO ══════════ */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">

          {/* Background image (slow ken-burns) */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 hero-kenburns">
              <Image
                src="/hero-bg.jpg"
                alt="Telugu filmmaker shooting in a village"
                fill
                priority
                className="object-cover object-[70%_center] md:object-center"
                sizes="100vw"
              />
            </div>
            {/* Scrims — dark in both themes so light hero text stays legible */}
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--scrim)] via-[color:var(--scrim)]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--scrim)] via-transparent to-transparent" />
            {/* Film grain */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
              style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 w-full">
            <div className="max-w-2xl">

              {/* Headline — purpose first */}
              <h1 className="mb-5 leading-[1.02]" style={{fontFamily: "'Georgia', 'Times New Roman', serif"}}>
                <span className="anim-fade-up block text-[2.75rem] sm:text-6xl md:text-7xl font-black text-white tracking-tight"
                  style={{animationDelay: '.14s', textShadow: '0 4px 32px rgba(0,0,0,0.75)'}}>
                  Mana Oori Cinema
                </span>
              </h1>

              {/* Telugu + English tagline */}
              <p className="anim-fade-up text-base text-[#FFC845] mb-1.5 tracking-wide"
                style={{fontFamily: "'Noto Sans Telugu', sans-serif", animationDelay: '.34s'}}>
                మీ ఊరి కథలు · మీ ఊరి సినిమా
              </p>

              <p className="anim-fade-up text-[#E7DCC5] max-w-xl mb-9 leading-relaxed text-base sm:text-lg"
                style={{animationDelay: '.42s'}}>
                CinemaVuru is the first <span className="text-white font-semibold">hyperlocal short-film platform</span> for
                Telugu filmmakers. Discover, watch and celebrate stories made by creators
                from your own district — across Telangana &amp; Andhra Pradesh.
              </p>

              {/* CTAs — discovery first, creation second */}
              <div className="anim-fade-up flex gap-3 sm:gap-4 flex-wrap mb-12" style={{animationDelay: '.52s'}}>
                <a href="#explore"
                  className="group relative overflow-hidden bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-7 sm:px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:shadow-2xl hover:shadow-orange-900/40 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="relative z-10">🎬 Explore Films</span>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                </a>
                <Link href="/upload"
                  className="border border-white/25 bg-white/5 backdrop-blur-sm text-white px-7 sm:px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-white/10 hover:border-white/40 hover:-translate-y-0.5 transition-all duration-300">
                  ＋ Share Your Film
                </Link>
              </div>

              {/* Stats with count-up */}
              <div className="anim-fade-up flex gap-8 flex-wrap" style={{animationDelay: '.62s'}}>
                {[
                  { value: totalFilms, suffix: '+', label: 'Short Films' },
                  { value: districts.length, suffix: '', label: 'Districts Live' },
                  { value: 2, suffix: '', label: 'Telugu States' },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-4">
                    {i > 0 && <div className="w-px h-9 bg-white/15" />}
                    <div>
                      <CountUp value={s.value} suffix={s.suffix}
                        className="block text-2xl sm:text-3xl font-black text-[#FFC845]" />
                      <div className="text-[11px] text-white/60 uppercase tracking-[2px] mt-1 font-medium">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <a href="#explore"
            className="anim-fade-in absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/60 hover:text-white transition"
            style={{animationDelay: '1s'}}>
            <span className="text-[10px] uppercase tracking-[3px]">Discover</span>
            <svg className="anim-bob" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Fade into page */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[color:var(--bg)] to-transparent z-[5]" />
        </section>

        {/* ══════════ MY LIST (client — shows once you save a film) ══════════ */}
        <MyListRail />

        {/* ══════════ FILM ROWS ══════════ */}
        {recentFilms.length > 0 && (
            <FilmRow
              films={recentFilms}
              eyebrow="Just Uploaded"
              title="🆕 Recently Added"
              subtitle="Fresh films from across Telugu land — be the first to watch!"
              accent="green"
              metric={(f) => `👁 ${f.view_count} views`}
            />
        )}
        {monthlyFilms.length > 0 && (
          <Reveal>
            <FilmRow
              films={monthlyFilms}
              eyebrow={`${monthName} ${new Date().getFullYear()}`}
              title={`🗓️ Top Films of ${monthName}`}
              subtitle="Films uploaded this month · Resets every month · Top film wins ₹2,000 + promo interview"
              accent="blue"
              showRankBadge
              metric={(f) => `👁 ${f.view_count} views`}
            />
          </Reveal>
        )}
        {topFilms.length > 0 && (
          <Reveal>
            <FilmRow
              films={topFilms}
              eyebrow="Trending Now"
              title="🔥 Most Watched"
              accent="gold"
              metric={(f) => `👁 ${f.view_count} views`}
            />
          </Reveal>
        )}
        {mostLiked.length > 0 && (
          <Reveal>
            <FilmRow
              films={mostLiked}
              eyebrow="Most Loved"
              title="❤️ Most Loved Films"
              accent="pink"
              metric={(f) => `❤️ ${f.like_count} likes`}
            />
          </Reveal>
        )}

        {/* ══════════ BROWSE BY GENRE ══════════ */}
        {genres.length > 0 && (
          <Reveal>
            <section className="max-w-6xl mx-auto px-6 py-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-px h-5 bg-[#FF6B1A]" />
                <span className="text-xs text-[color:var(--accent-hot)] uppercase tracking-[3px] font-semibold">Browse by Genre</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {genres.map(g => (
                  <Link key={g.genre} href={`/genre/${encodeURIComponent(g.genre)}`}
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-sm font-medium text-[color:var(--text)] hover:border-[color:var(--accent)]/50 hover:text-[color:var(--accent)] transition">
                    {g.genre}
                    <span className="text-[color:var(--muted)] text-xs group-hover:text-[color:var(--accent)]/70">{g.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* ══════════ EXPLORE BY DISTRICT ══════════ */}
        <section id="explore" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-20">
          <Reveal className="text-center mb-12">
            <span className="text-xs text-[color:var(--accent)] uppercase tracking-[4px] font-semibold">Start Here</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[color:var(--text)] mt-3" style={{fontFamily: "'Georgia', serif"}}>
              Explore by district
            </h2>
            <p className="text-[color:var(--muted)] text-sm mt-3 max-w-md mx-auto">
              Pick your district and dive into the short films made right where you live.
            </p>
          </Reveal>

          {/* Telangana */}
          <Reveal className="flex items-center gap-3 mb-6">
            <span className="w-px h-5 bg-[#FF6B1A]" />
            <span className="text-xs text-[color:var(--accent-hot)] uppercase tracking-[3px] font-semibold">Telangana</span>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-14">
            {telangana.map((d, i) => {
              const config = DISTRICT_CONFIG[d.slug] ?? { image: '', overlay: 'rgba(100,60,0,0.5)', landmark: '' }
              return (
                <Reveal key={d.id} delay={(i % 4) * 70}>
                  <Link href={`/${d.stateSlug}/${d.slug}`}
                    className="group relative block aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
                    {config.image && (
                      <Image src={config.image} alt={d.name_en} fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    )}
                    <div className="absolute inset-0 transition-opacity duration-300" style={{background: config.overlay}} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-[9px] text-white uppercase tracking-wide font-bold">Live</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-bold text-white text-base leading-tight mb-0.5 group-hover:text-[color:var(--accent)] transition-colors">{d.name_en}</h3>
                      <p className="text-white/50 text-[10px] mb-1">{d.name_te}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[color:var(--accent)] font-semibold">{d.filmCount} films</span>
                        <span className="text-[9px] text-white/40">{config.landmark}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-[color:var(--accent)]/40 transition-all duration-300" />
                  </Link>
                </Reveal>
              )
            })}
          </div>

          {/* Andhra Pradesh */}
          <Reveal className="flex items-center gap-3 mb-6">
            <span className="w-px h-5 bg-[#4A90E2]" />
            <span className="text-xs text-[#4A90E2] uppercase tracking-[3px] font-semibold">Andhra Pradesh</span>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {andhra.map((d, i) => {
              const config = DISTRICT_CONFIG[d.slug] ?? { image: '', overlay: 'rgba(0,60,120,0.5)', landmark: '' }
              return (
                <Reveal key={d.id} delay={(i % 4) * 70}>
                  <Link href={`/${d.stateSlug}/${d.slug}`}
                    className="group relative block aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
                    {config.image && (
                      <Image src={config.image} alt={d.name_en} fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                    )}
                    <div className="absolute inset-0 transition-opacity duration-300" style={{background: config.overlay}} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-[#4A90E2] rounded-full animate-pulse" />
                      <span className="text-[9px] text-white uppercase tracking-wide font-bold">Live</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-bold text-white text-base leading-tight mb-0.5 group-hover:text-[#90C8FF] transition-colors">{d.name_en}</h3>
                      <p className="text-white/50 text-[10px] mb-1">{d.name_te}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#4A90E2] font-semibold">{d.filmCount} films</span>
                        <span className="text-[9px] text-white/40">{config.landmark}</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-[#4A90E2]/40 transition-all duration-300" />
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* ══════════ WHY CINEMAVURU ══════════ */}
        <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <Reveal className="text-center mb-12">
            <span className="text-xs text-[color:var(--accent)] uppercase tracking-[4px] font-semibold">Why CinemaVuru</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[color:var(--text)] mt-3"
              style={{fontFamily: "'Georgia', serif"}}>
              A stage for every district
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: '📍', title: 'Hyperlocal by design', desc: 'Films are organised by district — so a story from your town reaches the people of your town first.' },
              { icon: '🌱', title: 'Local talent, real spotlight', desc: 'A filmmaker from a small village gets the same stage as one from the big city. Talent, not location, wins.' },
              { icon: '❤️', title: 'A community, not an algorithm', desc: 'Watch, like and comment. Every view is your district showing up to celebrate one of its own.' },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 110}>
                <div className="h-full bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl p-7 hover:-translate-y-1 hover:border-[color:var(--accent)]/40 transition-all duration-300">
                  <div className="text-4xl mb-4 anim-float" style={{animationDelay: `${i * 0.4}s`}}>{c.icon}</div>
                  <h3 className="font-bold text-[color:var(--text)] text-lg mb-2">{c.title}</h3>
                  <p className="text-[color:var(--muted)] text-sm leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════ HOW IT WORKS (generic) ══════════ */}
        <section className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <Reveal className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#D4A017]" />
              <span className="text-xs text-[color:var(--accent)] uppercase tracking-[4px]">How It Works</span>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#D4A017]" />
            </div>
            <h2 className="text-3xl font-bold text-[color:var(--text)] mb-2" style={{fontFamily: "'Georgia', serif"}}>
              Watch local. Or be watched.
            </h2>
            <p className="text-[color:var(--muted)] text-sm">Whether you came to discover or to create — start in seconds.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: '🍿', title: 'Discover', desc: 'Browse short films by district and find stories from your own corner of Telugu land.' },
              { step: '02', icon: '▶️', title: 'Watch & support', desc: 'Stream free, like your favourites and drop a comment. Your support means the world to a local creator.' },
              { step: '03', icon: '🎥', title: 'Share your own', desc: 'Upload your short film free in minutes — and get discovered by your district and far beyond.' },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 110}>
                <div className="relative h-full bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl p-8 overflow-hidden group hover:-translate-y-1 hover:border-[color:var(--accent)]/40 transition-all duration-300">
                  <div className="absolute top-4 right-5 text-5xl font-black text-[color:var(--text)]/[0.06] select-none" style={{fontFamily: "'Georgia', serif"}}>{s.step}</div>
                  <div className="text-4xl mb-5">{s.icon}</div>
                  <h3 className="font-bold text-[color:var(--text)] text-lg mb-3">{s.title}</h3>
                  <p className="text-[color:var(--muted)] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

        </section>

        {/* ══════════ FINAL CTA ══════════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B1A]/10 via-[#D4A017]/5 to-[#FF6B1A]/10" />
          <div className="absolute inset-0 border-t border-b border-[color:var(--accent)]/20" />
          <Reveal className="relative max-w-6xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-[color:var(--text)] mb-4" style={{fontFamily: "'Georgia', serif"}}>
              Be part of your district&apos;s cinema
            </h2>
            <p className="text-[color:var(--muted)] mb-10 max-w-lg mx-auto leading-relaxed">
              Discover local stories, cheer on your neighbours, or pick up a camera and add your own.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="#explore"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-10 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-2xl shadow-orange-900/30">
                🎬 Explore Films
              </a>
              <Link href="/upload"
                className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-10 py-4 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:-translate-y-0.5 transition-all">
                ＋ Share Your Film
              </Link>
            </div>
          </Reveal>
        </section>

      </main>
    </>
  )
}
