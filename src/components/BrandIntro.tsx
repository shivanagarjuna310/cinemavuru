// Compact brand/purpose band shown under the billboard — keeps the "Mana Oori
// Cinema" mission, tagline, description and stats front-and-centre for new
// visitors, without a second full-height hero.

import Image from 'next/image'
import Link from 'next/link'
import CountUp from './CountUp'
import Reveal from './Reveal'

export type Winner = {
  month?: string | null
  winner_name: string
  film_title?: string | null
  image_url: string
  blurb?: string | null
  filmHref?: string | null
}

export default function BrandIntro({
  totalFilms,
  districtCount,
  winner,
}: {
  totalFilms: number
  districtCount: number
  winner?: Winner | null
}) {
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-center">

        {/* Copy */}
        <Reveal>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-px bg-gradient-to-r from-[#FF6B1A] to-transparent" />
            <span className="text-xs text-[color:var(--accent-hot)] uppercase tracking-[3px] font-semibold">
              Mana Oori Cinema
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[color:var(--text)] leading-[1.05] mb-3"
            style={{ fontFamily: "'Georgia', serif" }}>
            The cinema of your district
          </h2>

          <p className="text-[color:var(--accent)] text-base mb-4"
            style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>
            మీ ఊరి కథలు · మీ ఊరి సినిమా
          </p>

          <p className="text-[color:var(--muted)] leading-relaxed text-base mb-8 max-w-xl">
            CinemaVuru is the first <span className="text-[color:var(--text)] font-semibold">hyperlocal short-film platform</span> for
            Telugu filmmakers. Discover, watch and celebrate stories made by creators from your own
            district — across Telangana &amp; Andhra Pradesh.
          </p>

          <div className="flex gap-3 sm:gap-4 flex-wrap mb-10">
            <a href="#explore"
              className="group relative overflow-hidden bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-7 py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:shadow-2xl hover:shadow-orange-900/40 hover:-translate-y-0.5 transition-all duration-300">
              <span className="relative z-10">🎬 Explore Films</span>
            </a>
            <Link href="/upload"
              className="border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-7 py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:-translate-y-0.5 transition-all duration-300">
              ＋ Share Your Film
            </Link>
          </div>

          <div className="flex gap-8 flex-wrap">
            {[
              { value: totalFilms, suffix: '+', label: 'Short Films' },
              { value: districtCount, suffix: '', label: 'Districts Live' },
              { value: 2, suffix: '', label: 'Telugu States' },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-9 bg-[color:var(--border)]" />}
                <div>
                  <CountUp value={s.value} suffix={s.suffix}
                    className="block text-2xl sm:text-3xl font-black text-[color:var(--accent)]" />
                  <div className="text-[11px] text-[color:var(--muted)] uppercase tracking-[2px] mt-1 font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Hero image — becomes the Monthly Winner spotlight when one is set */}
        <Reveal delay={120}>
          {winner ? (
            <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[color:var(--accent)]/40 shadow-[0_20px_60px_-20px_rgba(212,160,23,0.45)] bg-black">
              {/* Blurred fill so any aspect ratio looks intentional */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={winner.image_url} alt="" aria-hidden
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50" />
              {/* The full photo, never cropped */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={winner.image_url} alt={winner.winner_name}
                className="relative z-10 w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 z-20 rounded-2xl ring-1 ring-[#D4A017]/40 pointer-events-none" />

              {/* Trophy ribbon */}
              <div className="absolute z-30 top-3 left-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide shadow">
                🏆 Top Film{winner.month ? ` · ${winner.month}` : ''}
              </div>

              {/* Info */}
              <div className="absolute z-30 bottom-0 left-0 right-0 p-5">
                <p className="text-[#FFC845] text-[10px] uppercase tracking-[3px] font-semibold mb-1">Filmmaker of the month</p>
                <h3 className="text-white text-2xl sm:text-3xl font-black leading-tight" style={{ fontFamily: "'Georgia', serif" }}>
                  {winner.winner_name}
                </h3>
                {winner.film_title && (
                  <p className="text-white/80 text-sm italic mt-0.5">for “{winner.film_title}”</p>
                )}
                {winner.filmHref && (
                  <Link href={winner.filmHref}
                    className="inline-flex items-center gap-2 mt-3 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-white/85 transition">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Watch the film
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[color:var(--border)] shadow-2xl">
              <Image
                src="/hero-bg.jpg"
                alt="Telugu filmmaker shooting in a village"
                fill
                className="object-cover object-[70%_center]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {/* Film grain */}
              <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-white uppercase tracking-wide font-bold">Made in your district</span>
              </div>
            </div>
          )}
        </Reveal>

      </div>
    </section>
  )
}
