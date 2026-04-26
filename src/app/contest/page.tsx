// src/app/contest/page.tsx
// Public contest page — shows active contest, film entries, live leaderboard

import { createClient } from '@supabase/supabase-js'
import Link             from 'next/link'
import Navbar           from '@/components/Navbar'
import ContestFilmGrid  from '@/components/ContestFilmGrid'
export const revalidate = 0
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getActiveContest() {
  const { data } = await supabase
    .from('contests')
    .select('*, districts(name_en, name_te)')
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

async function getVoteCount(contestId: string) {
  const { count } = await supabase
    .from('contest_votes')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId)
  return count ?? 0
}

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days <= 0) return 'Ended'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function formatPrize(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

export default async function ContestPage() {
  const contest = await getActiveContest()

  if (!contest) {
    return (
      <>
        <Navbar />
        <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-2xl font-bold text-[#D4A017] mb-3">No Active Contest</h1>
            <p className="text-[#7A6040] mb-6">The next contest is coming soon. Stay tuned!</p>
            <Link href="/" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">
              ← Back to Films
            </Link>
          </div>
        </main>
      </>
    )
  }

  const [entries, voteCount] = await Promise.all([
    getContestEntries(contest.id),
    getVoteCount(contest.id),
  ])

  const district = contest.districts as { name_en: string; name_te: string } | null
  const submissionsLeft = daysLeft(contest.submissions_close_at)
  const votingLeft      = daysLeft(contest.voting_close_at)
  const isVotingPhase   = contest.status === 'voting'
  const isOpenPhase     = contest.status === 'open'

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">

        {/* ── Contest Header ── */}
        <div className="bg-gradient-to-b from-[#1A0A00] to-transparent border-b border-[#2E2010]">
          <div className="max-w-5xl mx-auto px-6 py-10">

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                isOpenPhase
                  ? 'text-green-400 border-green-700/40 bg-green-900/20'
                  : isVotingPhase
                  ? 'text-[#D4A017] border-[#D4A017]/40 bg-[#D4A017]/10'
                  : 'text-[#7A6040] border-[#2E2010]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOpenPhase ? 'bg-green-400 animate-pulse' : isVotingPhase ? 'bg-[#D4A017] animate-pulse' : 'bg-[#7A6040]'}`} />
                {isOpenPhase ? 'Submissions Open' : isVotingPhase ? 'Voting Live' : contest.status}
              </span>
              {district && (
                <span className="text-xs text-[#7A6040] uppercase tracking-widest">
                  {district.name_en} · {district.name_te}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-[#FDF6E3] mb-3 leading-tight">
              {contest.title}
            </h1>
            <p className="text-[#7A6040] text-sm leading-relaxed max-w-2xl mb-6">
              {contest.description}
            </p>

            {/* Stats row */}
            <div className="flex gap-6 flex-wrap mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D4A017]">{entries.length}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Films Entered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D4A017]">{voteCount}</div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FF6B1A]">
                  {isOpenPhase ? submissionsLeft : votingLeft}
                </div>
                <div className="text-xs text-[#7A6040] uppercase tracking-wide">
                  {isOpenPhase ? 'To Submit' : 'To Vote'}
                </div>
              </div>
            </div>

            {/* Prize money */}
            <div className="flex gap-3 flex-wrap mb-6">
              {[
                { place: '🥇 1st', amount: contest.prize_1st },
                { place: '🥈 2nd', amount: contest.prize_2nd },
                { place: '🥉 3rd', amount: contest.prize_3rd },
              ].map(p => (
                <div key={p.place} className="bg-[#1A1208] border border-[#2E2010] rounded-lg px-4 py-2 text-sm">
                  <span className="text-[#7A6040] mr-2">{p.place}</span>
                  <span className="text-[#D4A017] font-bold">{formatPrize(p.amount)}</span>
                </div>
              ))}
              <div className="bg-[#1A1208] border border-[#2E2010] rounded-lg px-4 py-2 text-sm">
                <span className="text-[#7A6040] mr-2">Entry Fee</span>
                <span className="text-[#FDF6E3] font-bold">{formatPrize(contest.entry_fee)}</span>
              </div>
            </div>

            {/* CTA buttons */}
            {isOpenPhase && (
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/contest/enter"
                  className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-orange-900/30 text-sm"
                >
                  🎬 Enter Your Film — {formatPrize(contest.entry_fee)}
                </Link>
                <div className="border border-[#2E2010] rounded-lg px-4 py-3 text-sm text-[#7A6040]">
                  Voting opens after submissions close
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Contest Films ── */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {entries.length === 0 ? (
            <div className="text-center py-20 text-[#7A6040]">
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-xl font-semibold mb-2">No entries yet</p>
              <p className="text-sm mb-6">Be the first filmmaker to enter!</p>
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
                  {isVotingPhase ? '🗳️ Vote for Your Favourite' : '🎬 Contest Films'}
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
