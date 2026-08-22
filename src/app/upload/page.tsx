// src/app/upload/page.tsx
// Film upload page — creators submit their film details here.
// Video is hosted on YouTube (unlisted) for now.
// Saved to Supabase films table with status = 'pending'.
// You (admin) approve it → status becomes 'active' → shows on site.

import Navbar     from '@/components/Navbar'
import UploadForm from '@/components/UploadForm'

export default function UploadPage() {
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">

        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,107,26,0.06),transparent)] pointer-events-none" />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">

          {/* Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎬</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text)] mb-2">
              Upload Your Film
            </h1>
            <p className="text-[color:var(--muted)] leading-relaxed text-sm sm:text-base">
              Submit your short film to CinemaVuru. We review every film
              before it goes live — usually within 24 hours.
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10">
            {[
              { step: '1', icon: '📤', label: 'Upload to YouTube', desc: 'As Unlisted' },
              { step: '2', icon: '📝', label: 'Fill this form',    desc: 'Paste your link' },
              { step: '3', icon: '✅', label: 'We review & publish', desc: 'Within 24hrs' },
            ].map(s => (
              <div key={s.step} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3 sm:p-4 text-center">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-xs font-bold text-[color:var(--accent)] uppercase tracking-wide mb-1">{s.label}</div>
                <div className="text-xs text-[color:var(--muted)]">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* The form */}
          <UploadForm />

        </div>
      </main>
    </>
  )
}
