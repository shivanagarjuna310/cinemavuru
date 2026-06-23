// src/app/about/page.tsx
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export const metadata = {
  title: 'About | CinemaVuru',
  description: 'CinemaVuru — India\'s first hyperlocal short film platform for Telugu filmmakers across Telangana & Andhra Pradesh.',
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#07080f] text-[#FDF6E3] pt-16">

        {/* ── HERO ── */}
        <section className="relative max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#D4A017]" />
            <span className="text-xs text-[#D4A017] uppercase tracking-[4px]">Our Story</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#D4A017]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            About CinemaVuru
          </h1>
          <p className="text-[#7A6040] text-sm"
            style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>
            సినిమా ఊరు · Founded February 2026
          </p>
        </section>

        {/* ── CONTACT SECTION (top, visible) ── */}
        <section className="max-w-4xl mx-auto px-6 mb-16">
          <div className="relative rounded-2xl border border-[#D4A017]/30 bg-gradient-to-br from-[#D4A017]/10 to-transparent p-8 md:p-12">

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#FF6B1A]/10 to-transparent rounded-2xl" />

            <div className="flex items-center gap-3 mb-6">
              <span className="w-px h-5 bg-[#FF6B1A]" />
              <span className="text-xs text-[#FF6B1A] uppercase tracking-[3px] font-semibold">Get In Touch</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3"
              style={{ fontFamily: "'Georgia', serif" }}>
              We'd love to hear from you
            </h2>
            <p className="text-[#4A5A70] text-sm mb-8 max-w-lg leading-relaxed">
              Have a question, feedback, or need help with your submission? Reach out — we typically respond within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Email */}
              <a href="mailto:cinemavuruconnects@gmail.com"
                className="group flex items-center gap-4 bg-[#0d1020] border border-[#D4A017]/20 hover:border-[#D4A017]/60 rounded-xl px-6 py-4 transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B1A]/20 to-[#D4A017]/20 flex items-center justify-center text-xl shrink-0">
                  ✉️
                </div>
                <div>
                  <p className="text-[#4A5A70] text-[10px] uppercase tracking-widest mb-0.5">Email Us</p>
                  <p className="text-[#D4A017] text-sm font-semibold group-hover:text-[#FFB830] transition-colors">
                    cinemavuruconnects@gmail.com
                  </p>
                </div>
              </a>

              {/* Instagram */}
              <a href="https://www.instagram.com/cinemavuruofficial?igsh=MXRvc2o1NW9mMXFscg=="
                target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-[#0d1020] border border-[#D4A017]/20 hover:border-[#FF6B1A]/60 rounded-xl px-6 py-4 transition-all duration-300 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF6B1A]/20 to-[#D4A017]/20 flex items-center justify-center text-xl shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#D4A017" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="#D4A017" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1" fill="#D4A017"/></svg>
                </div>
                <div>
                  <p className="text-[#4A5A70] text-[10px] uppercase tracking-widest mb-0.5">Follow Us</p>
                  <p className="text-[#D4A017] text-sm font-semibold group-hover:text-[#FFB830] transition-colors">
                    @cinemavuru
                  </p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ── STORY SECTION ── */}
        <section className="max-w-4xl mx-auto px-6 pb-20">

          <div className="flex items-center gap-3 mb-10">
            <span className="w-px h-5 bg-[#D4A017]" />
            <span className="text-xs text-[#D4A017] uppercase tracking-[3px] font-semibold">The Story Behind CinemaVuru</span>
          </div>

          <div className="grid md:grid-cols-[1fr_2fr] gap-12">

            {/* Left — pull quote */}
            <div className="space-y-6">
              <div className="border-l-2 border-[#FF6B1A] pl-6">
                <p className="text-xl font-bold text-white leading-snug"
                  style={{ fontFamily: "'Georgia', serif" }}>
                  "What if every district had its own stage?"
                </p>
              </div>

              {/* Mission card */}
              <div className="bg-[#0d1020] border border-[#D4A017]/20 rounded-xl p-6">
                <p className="text-[#4A5A70] text-[10px] uppercase tracking-widest mb-3">Our Mission</p>
                <p className="text-[#FDF6E3] text-sm leading-relaxed">
                  To discover and celebrate filmmaking talent from every district of Telugu land — because every region has a story worth telling.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { num: 'Feb 2026', label: 'Founded' },
                  { num: '11+',      label: 'Districts' },
                  { num: '2',        label: 'States' },
                  { num: '∞',        label: 'Stories' },
                ].map(s => (
                  <div key={s.label} className="bg-[#0d1020] border border-[#1e2535] rounded-lg p-4 text-center">
                    <div className="text-lg font-black text-[#D4A017]"
                      style={{ fontFamily: "'Georgia', serif" }}>{s.num}</div>
                    <div className="text-[9px] text-[#3A4A60] uppercase tracking-[2px] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — full story */}
            <div className="space-y-6 text-[#6A7A80] text-sm leading-relaxed">
              <p>
                YouTube gave filmmakers a stage. But for thousands of talented creators from places like
                Nalgonda, Karimnagar, Warangal, Vizag, and Kadapa, getting discovered remains a challenge.
                Their films are uploaded into a global ocean of content, where even people from their own
                district may never find them.
              </p>

              <p>
                We asked a simple question: <span className="text-white font-semibold">What if a filmmaker from Warangal could be discovered first by Warangal?</span> What
                if audiences could easily find and celebrate stories created by people from their own towns
                and communities?
              </p>

              <p>
                That idea became CinemaVuru.
              </p>

              <p>
                Founded in February 2026, CinemaVuru is a hyperlocal short film platform built for Telugu
                filmmakers across Telangana and Andhra Pradesh. Films are organized by district, helping
                local creators reach local audiences while building recognition that starts at home.
              </p>

              <p>
                Think of it like this — in college, a student who excels at dancing or acting and is
                recognized across their campus feels like a hero. That local recognition is real,
                personal, and powerful. <span className="text-white font-semibold">CinemaVuru brings that same feeling to filmmakers.</span>
              </p>

              <p>
                Here, talent doesn't have to compete with the entire internet to be noticed. A powerful
                story from a small town deserves the same spotlight as one from a big city.
              </p>

              <p className="text-[#FDF6E3] font-medium border-l-2 border-[#D4A017] pl-4">
                CinemaVuru is more than a platform — it's a community where creators grow, audiences
                discover local talent, and every district gets a chance to celebrate its storytellers.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONTEST SECTION ── */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="relative rounded-2xl border border-[#D4A017]/30 bg-gradient-to-br from-[#FF6B1A]/5 to-transparent p-8 md:p-12 overflow-hidden">

            {/* Decorative bg text */}
            <div className="absolute top-4 right-6 text-[120px] font-black text-white/[0.03] select-none leading-none"
              style={{ fontFamily: "'Georgia', serif" }}>WIN</div>

            <div className="flex items-center gap-3 mb-6">
              <span className="w-px h-5 bg-[#FF6B1A]" />
              <span className="text-xs text-[#FF6B1A] uppercase tracking-[3px] font-semibold">The Contest</span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight"
              style={{ fontFamily: "'Georgia', serif" }}>
              Your Shot at the Spotlight
            </h2>

            <p className="text-[#4A5A70] text-sm leading-relaxed mb-6 max-w-xl">
              Once every season, the stage opens. Filmmakers from every corner of Telangana and Andhra
              Pradesh bring their best work. Only the strongest stories survive.
            </p>

            <div className="border-l-2 border-[#FF6B1A] pl-6 mb-8">
              <p className="text-[#FDF6E3] text-sm leading-relaxed italic">
                That film you shot in your village. That story only your town knows. That emotion only
                your language can express.<br />
                <span className="text-white font-bold not-italic">It could win.</span>
              </p>
            </div>

            <p className="text-[#4A5A70] text-sm leading-relaxed mb-8 max-w-xl">
              When you enter the CinemaVuru contest, your film doesn't just get uploaded — it enters a
              living, breathing leaderboard where your district rallies behind you, your college shares
              your link, your fans vote, and strangers become your audience.
            </p>

            {/* How to Participate */}
            <div className="mb-10">
              <p className="text-xs text-[#D4A017] uppercase tracking-[3px] font-semibold mb-5">How to Participate</p>
              <div className="space-y-3">
                {[
                  { step: '01', text: 'Upload your short film with a YouTube link.' },
                  { step: '02', text: 'Choose the active season contest.' },
                  { step: '03', text: 'Pay the season entry fee.' },
                  { step: '04', text: 'Share your film and earn votes' },
                  { step: '05', text: 'Climb the leaderboard and compete for the top 3.' },
                ].map(item => (
                  <div key={item.step} className="flex items-center gap-4 bg-[#0d1020] border border-[#1e2535] rounded-xl px-5 py-4">
                    <span className="text-xs font-black text-[#FF6B1A]/60 w-6 shrink-0"
                      style={{ fontFamily: "'Georgia', serif" }}>{item.step}</span>
                    <p className="text-[#6A7A80] text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What You Get */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { icon: '🏟️', title: 'Your Film on the Leaderboard', desc: 'The whole CinemaVuru community sees you — your district, your story, your name.' },
                { icon: '🗳️', title: 'Real Votes, Real Support',     desc: 'Your people show up for you. Every vote is someone saying — this story matters.' },
                { icon: '🏆', title: 'Top 3 Win Real Prize Money',   desc: 'Not likes. Not views. Real cash — straight to the filmmakers who earned it.' },
                { icon: '🌟', title: 'Hall of Fame — Forever',       desc: 'Winners are remembered here permanently, representing their district for all time.' },
                { icon: '📈', title: 'Visibility & New Followers',   desc: 'Contest entries get more eyes — from your district and beyond.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 bg-[#0d1020] border border-[#1e2535] rounded-xl p-5">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-white text-sm font-bold mb-1">{item.title}</p>
                    <p className="text-[#4A5A70] text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* More than a competition */}
            <div className="bg-[#0d1020] border border-[#1e2535] rounded-xl p-6 mb-10">
              <p className="text-xs text-[#D4A017] uppercase tracking-[3px] font-semibold mb-4">🌟 More Than A Competition</p>
              <div className="space-y-2 text-[#6A7A80] text-sm leading-relaxed">
                <p>Winning is great. But CinemaVuru is about something bigger.</p>
                <p>It's about helping every district discover its storytellers. A filmmaker from a small town should have the same opportunity to be celebrated as someone from a major city.</p>
                <p className="text-[#FDF6E3] font-medium">Every upload matters. Every vote matters. Every story matters.</p>
              </div>
            </div>

            {/* Free upload callout */}
            <div className="bg-[#0d1020] border border-[#4A90E2]/20 rounded-xl p-6 mb-10">
              <p className="text-xs text-[#4A90E2] uppercase tracking-[3px] font-semibold mb-3">📽️ Just Want to Share Your Film?</p>
              <p className="text-[#6A7A80] text-sm leading-relaxed mb-1">
                Not ready for the contest? No problem. CinemaVuru is free to join. Upload your short film anytime — no entry fee, no competition pressure. Your film gets listed on the platform, organized by your district, and discovered by audiences searching for local stories.
              </p>
              <p className="text-[#4A90E2] text-sm font-medium mt-3">
                Free uploads are always welcome. When you're ready to compete — the contest is waiting.
              </p>
            </div>

            <div className="border-t border-[#D4A017]/20 pt-8">
              <p className="text-[#D4A017] text-sm font-semibold mb-1">
                The entry fee isn't a cost. It's your bet on yourself.
              </p>
              <p className="text-[#4A5A70] text-sm mb-6">Are you in?</p>
              <div className="flex gap-4 flex-wrap">
                <a href="/contest/enter"
                  className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all">
                  🏆 Enter the Contest
                </a>
                <a href="/contest"
                  className="border border-[#D4A017]/40 text-[#D4A017] px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:-translate-y-0.5 transition-all">
                  View Current Season
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="relative overflow-hidden border-t border-[#D4A017]/20">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B1A]/5 via-[#D4A017]/5 to-[#FF6B1A]/5" />
          <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3"
              style={{ fontFamily: "'Georgia', serif" }}>
              Ready to share your story?
            </h2>
            <p className="text-[#4A5A70] text-sm mb-8">Join Telugu filmmakers from across Telangana & Andhra Pradesh.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/upload"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all">
                📽️ Upload Free
              </Link>
              <Link href="/contest"
                className="border border-[#D4A017]/40 text-[#D4A017] px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-[#D4A017]/10 hover:-translate-y-0.5 transition-all">
                🏆 Enter Contest
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
