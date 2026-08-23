// src/app/upload/page.tsx
// Film upload page — creators submit their film details here.
// Video is hosted on YouTube (unlisted) for now.
// Saved to Supabase films table with status = 'pending'.

import Navbar     from '@/components/Navbar'
import UploadForm from '@/components/UploadForm'

const BENEFITS = [
  { icon: '📍', title: 'Your district first', desc: 'Your town discovers your film before anyone else.' },
  { icon: '🏆', title: 'Win the monthly contest', desc: 'Top films earn cash prizes + a spotlight.' },
  { icon: '❤️', title: 'Build a real following', desc: 'Likes, comments and followers that come back.' },
  { icon: '🆓', title: 'Free forever', desc: 'No fees to publish. Ever.' },
]

const STEPS = [
  { n: '1', title: 'Upload to YouTube', desc: 'Set it to Unlisted, copy the link.' },
  { n: '2', title: 'Fill this form', desc: 'Paste the link + a few details.' },
  { n: '3', title: 'We review & publish', desc: 'Usually live within 24 hours.' },
]

export default function UploadPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,107,26,0.08),transparent)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">

          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block text-xs text-[color:var(--accent-hot)] uppercase tracking-[3px] font-semibold mb-3">
              Share Your Film
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-[color:var(--text)] mb-3" style={{ fontFamily: "'Georgia', serif" }}>
              Put your story on the map
            </h1>
            <p className="text-[color:var(--muted)] leading-relaxed text-sm sm:text-base max-w-xl mx-auto">
              Submit your short film to CinemaVuru — we review every film before it
              goes live, usually within 24 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1fr_20rem] gap-6 lg:gap-8 items-start">

            {/* Form */}
            <div className="order-2 lg:order-1">
              <UploadForm />
            </div>

            {/* Aside */}
            <aside className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-24">
              {/* Why */}
              <div className="bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[color:var(--text)] mb-4">Why share on CinemaVuru</h3>
                <div className="space-y-3.5">
                  {BENEFITS.map(b => (
                    <div key={b.title} className="flex gap-3">
                      <div className="text-xl leading-none flex-shrink-0">{b.icon}</div>
                      <div>
                        <div className="text-[color:var(--text)] text-sm font-semibold leading-tight">{b.title}</div>
                        <div className="text-[color:var(--muted)] text-xs mt-0.5 leading-snug">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="bg-[color:var(--surface-2)] border border-[color:var(--border-2)] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[color:var(--text)] mb-4">What happens next</h3>
                <div className="space-y-4">
                  {STEPS.map((s, i) => (
                    <div key={s.n} className="flex gap-3 relative">
                      {i < STEPS.length - 1 && (
                        <div className="absolute left-3 top-7 bottom-[-16px] w-px bg-[color:var(--border)]" />
                      )}
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] text-black text-xs font-bold flex items-center justify-center flex-shrink-0 relative z-10">
                        {s.n}
                      </div>
                      <div>
                        <div className="text-[color:var(--text)] text-sm font-semibold leading-tight">{s.title}</div>
                        <div className="text-[color:var(--muted)] text-xs mt-0.5 leading-snug">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>
    </>
  )
}
