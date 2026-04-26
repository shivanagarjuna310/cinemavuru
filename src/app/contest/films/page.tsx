// src/app/contest/films/page.tsx
// Shows all contest film entries for the active contest — with voting
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import Link             from 'next/link'
import Navbar           from '@/components/Navbar'
import ContestFilmGrid  from '@/components/ContestFilmGrid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getActiveContest() {
  const { data } = await supabase
    .from('contests')
    .select('*')
    .in('status', ['open', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getContestEntries(contestId: string) {
  const { data } = await supabase
    .from('contest_entries')
    .select('*, films(*, profiles(name))')
    .eq('contest_id', contestId)
    .eq('is_approved', true)
    .eq('payment_status', 'paid')
    .order('contest_score', { ascending: false })
  return data ?? []
}

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days <= 0) return 'Ended'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export default async function ContestFilmsPage() {
  const contest = await getActiveContest()

  if (!contest) {
    return (
      <>
        <Navbar />
        <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-[#D4A017] mb-3">No Active Contest</h1>
            <p className="text-[#7A6040] mb-6">Check back when the next contest opens!</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/contest"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">
                View Contest →
              </Link>
              <Link href="/contest/winners"
                className="border border-[#D4A017]/40 text-[#D4A017] px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition text-sm">
                🏛️ Hall of Fame
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }
  
  const entries = await getContestEntries(contest.id)
  const isVotingPhase = contest.status === 'voting'
  const isOpenPhase   = contest.status === 'open'
  console.log('Contest ID:', contest.id)
  console.log('Entries count:', entries.length)
  console.log('Entries:', JSON.stringify(entries))
  const timeLeft      = isVotingPhase
    ? daysLeft(contest.voting_close_at)
    : daysLeft(contest.submissions_close_at)

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">

        {/* Header */}
        <div className="bg-gradient-to-b from-[#1A0A00] to-transparent border-b border-[#2E2010]">
          <div className="max-w-5xl mx-auto px-6 py-10">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-4">
              <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
              <span>›</span>
              <Link href="/contest" className="hover:text-[#D4A017] transition">Contest</Link>
              <span>›</span>
              <span className="text-[#D4A017]">Films</span>
            </div>

            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                    isVotingPhase
                      ? 'text-[#D4A017] border-[#D4A017]/40 bg-[#D4A017]/10'
                      : 'text-green-400 border-green-700/40 bg-green-900/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isVotingPhase ? 'bg-[#D4A017]' : 'bg-green-400'
                    }`} />
                    {isVotingPhase ? 'Voting Live' : 'Submissions Open'}
                  </span>
                  {timeLeft && (
                    <span className="text-xs text-[#FF6B1A] font-bold">{timeLeft}</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-[#FDF6E3] mb-1">
                  🎬 Contest Films
                </h1>
                <p className="text-[#7A6040] text-sm">{contest.title}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#D4A017]">{entries.length}</div>
                  <div className="text-xs text-[#7A6040] uppercase tracking-wide">Films</div>
                </div>
              </div>
            </div>

            {/* Action links */}
            <div className="flex gap-3 mt-6 flex-wrap">
              <Link href="/contest"
                className="border border-[#2E2010] text-[#7A6040] px-4 py-2 rounded-lg text-sm hover:text-[#D4A017] hover:border-[#D4A017]/40 transition">
                ← Contest Info
              </Link>
              {isOpenPhase && (
                <Link href="/contest/enter"
                  className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide hover:opacity-90 transition">
                  Enter Your Film →
                </Link>
              )}
              <Link href="/contest/winners"
                className="border border-[#D4A017]/40 text-[#D4A017] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#D4A017]/10 transition">
                🏛️ Hall of Fame
              </Link>
            </div>
          </div>
        </div>

        {/* Films grid */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {entries.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-xl font-semibold text-[#D4A017] mb-2">No entries yet</p>
              <p className="text-sm text-[#7A6040] mb-6">Be the first filmmaker to enter this contest!</p>
              {isOpenPhase && (
                <Link href="/contest/enter"
                  className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">
                  Enter Your Film →
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#D4A017]">
                  {isVotingPhase ? '🗳️ Vote for Your Favourite' : '🎬 Entered Films'}
                </h2>
              </div>
              <ContestFilmGrid
                entries={entries}
                contestId={contest.id}
                isVotingOpen={isVotingPhase}
              />
            </>
          )}
        </div>

      </main>
    </>
  )
}
