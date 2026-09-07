// src/app/upload/page.tsx
// Film upload page — creators submit their film details here.
// Video is hosted on YouTube (unlisted) for now.
// Saved to Supabase films table with status = 'pending'.

import Link              from 'next/link'
import { createClient }  from '@supabase/supabase-js'
import Navbar            from '@/components/Navbar'
import UploadForm        from '@/components/UploadForm'
import ContestComingSoon from '@/components/ContestComingSoon'

// Cached: this page only needs the contest headline, and a stale-by-5-minutes
// prize figure is fine. Keeps the extra query off every upload page view.
export const revalidate = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Includes 'open', not just 'upcoming': while a season is running this page has
// to say what it is NOT, or a creator who came here to enter the contest fills
// in the free form and believes they have entered.
async function getContest() {
  const { data } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['upcoming', 'open'])
    .order('season_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// Named prize figures beat vague promises — this is the page where someone is
// already deciding whether the effort is worth it.
function benefits(opts: { firstPrize: number | null; entryFee: number | null; contestOpen: boolean }) {
  const { firstPrize, entryFee, contestOpen } = opts
  // While the contest is open, "win prizes" next to "free forever" is the exact
  // pairing that convinces someone a free upload entered them. Name the fee and
  // say it is a separate form instead.
  const contestItem = contestOpen
    ? {
        icon: '🏆',
        title: 'The contest is separate',
        desc: `Entering costs ${entryFee != null ? `₹${entryFee}` : 'a fee'} and uses a different form. Publishing here does not enter you.`,
      }
    : firstPrize
      ? { icon: '🏆', title: `₹${firstPrize.toLocaleString('en-IN')} first prize`, desc: 'A short film competition is coming. Details announced soon.' }
      : { icon: '🏆', title: 'Win the monthly contest', desc: 'Top films earn cash prizes + a spotlight.' }

  return [
    { icon: '📍', title: 'Your district first', desc: 'Your town discovers your film before anyone else.' },
    contestItem,
    { icon: '❤️', title: 'Build a real following', desc: 'Likes, comments and followers that come back.' },
    { icon: '🆓', title: 'Free to publish', desc: 'No fees to put your film on CinemaVuru.' },
  ]
}

const STEPS = [
  { n: '1', title: 'Upload to YouTube', desc: 'Set it to Unlisted, copy the link.' },
  { n: '2', title: 'Fill this form', desc: 'Paste the link + a few details.' },
  { n: '3', title: 'We review & publish', desc: 'Usually live within 24 hours.' },
]

export default async function UploadPage() {
  const contest = await getContest()
  const contestOpen = contest?.status === 'open'
  const BENEFITS = benefits({
    firstPrize: contest?.prize_1st ?? null,
    entryFee: contest?.entry_fee ?? null,
    contestOpen,
  })
  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,107,26,0.08),transparent)] pointer-events-none" />

        {contestOpen ? (
          <div className="relative z-10 pt-6 max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-[color:var(--surface-2)] border border-[color:var(--border-2)] border-l-4 border-l-red-600 rounded-2xl p-5 sm:flex sm:items-center sm:gap-5">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[2px] font-extrabold text-white bg-red-600 rounded-full px-2.5 py-1 mb-2.5">
                  Not the contest form
                </div>
                <p className="text-[color:var(--text)] text-sm sm:text-base font-bold leading-snug">
                  This is the free upload — it will not enter you in {contest.title ?? 'the contest'}.
                </p>
                <p className="text-[color:var(--muted)] text-xs mt-1.5 leading-relaxed">
                  Use this form to publish your film on CinemaVuru for free. To compete for the
                  prize money you must use the contest entry form
                  {contest.entry_fee != null ? `, which costs ₹${contest.entry_fee}` : ''} and asks
                  you to declare your role in the film.
                </p>
              </div>
              <Link
                href="/contest/enter"
                className="mt-4 sm:mt-0 flex-shrink-0 inline-flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black font-extrabold text-sm px-5 py-3 rounded-xl"
              >
                🏆 Enter the contest{contest.entry_fee != null ? ` — ₹${contest.entry_fee}` : ''} →
              </Link>
            </div>
          </div>
        ) : contest ? (
          <div className="relative z-10 pt-6">
            <ContestComingSoon contest={contest} compact />
          </div>
        ) : null}

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
              <UploadForm
                openContest={
                  contestOpen
                    ? { title: contest.title ?? null, entryFee: contest.entry_fee ?? null }
                    : null
                }
              />
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
