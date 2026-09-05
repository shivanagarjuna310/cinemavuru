'use client'
// src/components/ContestFilmGrid.tsx
// Shows contest film entries with rank, score and vote button
// Voting: 1 vote per user per contest — locked once cast, cannot be changed

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'
import { useAuth }             from './AuthProvider'

type Entry = {
  id:            string
  contest_id:    string
  film_id:       string
  contest_score: number
  // Engagement earned since this film entered, so an older film gets no head
  // start over a new one. Lifetime totals still live on films.like_count /
  // films.view_count and are shown everywhere outside the contest.
  likes_since?:  number
  views_since?:  number
  films: {
    id:          string
    title_en:    string
    title_te:    string | null
    genre:       string | null
    view_count:  number
    like_count:  number
    video_url:   string | null
    profiles:    { name: string | null } | null
    districts:   { slug: string | null; states: { slug: string | null } | { slug: string | null }[] | null } | null
  } | null
}

type Props = {
  entries:       Entry[]
  contestId:     string
  isVotingOpen:  boolean
}

const GENRE_STYLE: Record<string, { emoji: string; gradient: string }> = {
  Drama:       { emoji: '🌾', gradient: 'from-[#FF6B1A] to-[#F5A623]' },
  Comedy:      { emoji: '🌅', gradient: 'from-[#8B1A1A] to-[#FF6B1A]' },
  Documentary: { emoji: '🏛️', gradient: 'from-[#1A1A4E] to-[#8B1A1A]' },
  Thriller:    { emoji: '🌊', gradient: 'from-[#0A1A2E] to-[#1A4E8B]'  },
  Family:      { emoji: '🎭', gradient: 'from-[#1A1A4E] to-[#FF6B1A]' },
  Action:      { emoji: '⚡', gradient: 'from-[#1A0A2E] to-[#8B1A4E]'  },
  Romance:     { emoji: '🌸', gradient: 'from-[#2E0A1A] to-[#8B1A3A]'  },
  Default:     { emoji: '🎬', gradient: 'from-[color:var(--surface)] to-[color:var(--border)]'  },
}
function getThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null
  const match = videoUrl.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (!match) return null
  return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
}
const RANK_STYLE = [
  'text-[#FFD700] text-xl',  // 1st - gold
  'text-[#C0C0C0] text-lg',  // 2nd - silver
  'text-[#CD7F32] text-lg',  // 3rd - bronze
]

export default function ContestFilmGrid({ entries, contestId, isVotingOpen }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [votedFilmId,   setVotedFilmId]   = useState<string | null>(null)
  const [hasVoted,      setHasVoted]      = useState(false) // ← locked once true
  const [voting,        setVoting]        = useState(false)
  const [localEntries,  setLocalEntries]  = useState(entries)

  // Load this user's existing vote (reactive to the shared auth user)
  useEffect(() => {
    if (!userId) { setVotedFilmId(null); setHasVoted(false); return }
    let cancelled = false
    supabase
      .from('contest_votes').select('film_id')
      .eq('contest_id', contestId).eq('user_id', userId).maybeSingle()
      .then(({ data: vote }) => {
        if (!cancelled && vote) { setVotedFilmId(vote.film_id); setHasVoted(true) }
      })
    return () => { cancelled = true }
  }, [contestId, userId])

  const [voteError, setVoteError] = useState('')

  // One call for vote / change / withdraw. The server recomputes the score
  // from a real count and returns it, so the UI cannot drift from the truth.
  async function submitVote(filmId: string | null, action: 'vote' | 'unvote') {
    if (!userId) { router.push('/auth'); return }
    if (voting) return
    setVoting(true); setVoteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/contest/vote', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ contestId, filmId, action }),
      })
      const j = await res.json()
      if (!res.ok) { setVoteError(j.error || 'Could not record your vote.'); return }

      setVotedFilmId(j.votedFilmId ?? null)
      setHasVoted(Boolean(j.votedFilmId))

      const scores: Record<string, number> = j.scores ?? {}
      setLocalEntries(prev => prev
        .map(e => (e.film_id in scores ? { ...e, contest_score: scores[e.film_id] } : e))
        .sort((a, b) => b.contest_score - a.contest_score))
    } catch {
      setVoteError('Network problem — please try again.')
    } finally {
      setVoting(false)
    }
  }

  function goToFilm(filmId: string) {
    // Was hardcoded to /telangana/hyderabad/, which sent every non-Hyderabad
    // film to the wrong district URL (the test entry is from Anantapur).
    const e = localEntries.find(x => x.film_id === filmId)
    const d = e?.films?.districts
    const st = d && (Array.isArray(d.states) ? d.states[0] : d.states)
    router.push(`/${st?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${filmId}`)
  }

  return (
    <div className="space-y-4">
      {voteError && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {voteError}
        </p>
      )}

      {localEntries.map((entry, index) => {
        const film  = entry.films
        if (!film) return null
        const style    = GENRE_STYLE[film.genre ?? ''] ?? GENRE_STYLE.Default
        const isMyVote = votedFilmId === entry.film_id
        const rank     = index + 1

        return (
          <div
            key={entry.id}
            className={`bg-[color:var(--surface)] border rounded-xl overflow-hidden transition-all duration-300 ${
              rank === 1 ? 'border-[#FFD700]/30' :
              rank === 2 ? 'border-[#C0C0C0]/20' :
              rank === 3 ? 'border-[#CD7F32]/20' :
              'border-[color:var(--border)]'
            } ${isMyVote ? 'ring-1 ring-[#D4A017]/30' : ''}`}
          >
            {/* Mobile stacks into two rows: identity on top, votes + action
                below. It used to be one flex row with five children, four of
                them flex-shrink-0, which could not fit a 360px screen and made
                the name, vote count and button overlap. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 sm:flex-1">

              {/* Rank */}
              <div className={`text-center w-8 flex-shrink-0 font-bold ${RANK_STYLE[rank - 1] ?? 'text-[color:var(--muted)] text-base'}`}>
                {isVotingOpen
                  ? (rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`)
                  : <span className="text-[color:var(--faint)] text-xs">#{rank}</span>
                }
              </div>

              {/* Thumbnail */}
              <div
                onClick={() => goToFilm(film.id)}
                className={`relative w-20 h-12 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-gradient-to-br ${style.gradient} flex items-center justify-center text-2xl cursor-pointer flex-shrink-0 group`}
              >
                {getThumbnail(film.video_url) ? (
                  <img
                    src={getThumbnail(film.video_url)!}
                    alt={film.title_en}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  style.emoji
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">▶</span>
                </div>
              </div>

              {/* Film info */}
              <div className="flex-1 min-w-0">
                <h3
                  onClick={() => goToFilm(film.id)}
                  className="font-bold text-[color:var(--text)] text-sm cursor-pointer hover:text-[color:var(--accent)] transition line-clamp-1 mb-0.5"
                >
                  {film.title_en}
                </h3>
                {film.title_te && (
                  <p className="text-[color:var(--muted)] text-xs mb-1">{film.title_te}</p>
                )}
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[color:var(--muted)] flex-wrap">
                  <span className="truncate max-w-[9rem]">{film.profiles?.name ?? 'Creator'}</span>
                  <span>·</span>
                  <span>{film.genre}</span>
                  <span>·</span>
                  <span title="Likes since this film entered the contest">
                    ♥ {entry.likes_since ?? 0}
                  </span>
                  <span>·</span>
                  <span title="Views since this film entered the contest">
                    👁 {entry.views_since ?? 0}
                  </span>
                  <span className="text-[color:var(--faint)]">since entry</span>
                </div>
              </div>

              </div>

              {/* Votes + actions. Own row on mobile, inline from sm up. */}
              <div className="flex items-center justify-between gap-3 sm:gap-4 sm:justify-end border-t border-[color:var(--border)] pt-3 sm:border-0 sm:pt-0">
                <div className="text-center flex-shrink-0">
                  <div className="text-xl font-bold text-[color:var(--accent)] tabular-nums">{entry.contest_score}</div>
                  <div className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">
                    {entry.contest_score === 1 ? 'Vote' : 'Votes'}
                  </div>
                </div>

                {isVotingOpen && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isMyVote ? (
                      <>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--accent)] whitespace-nowrap">
                          ✓ Your vote
                        </span>
                        {/* The missing escape hatch: a vote used to be permanent. */}
                        <button
                          onClick={() => submitVote(null, 'unvote')}
                          disabled={voting}
                          className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent-hot)] hover:border-[color:var(--accent-hot)]/40 transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {voting ? '…' : 'Undo'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => submitVote(entry.film_id, 'vote')}
                        disabled={voting}
                        title={hasVoted ? 'This will move your vote to this film' : 'Vote for this film'}
                        className="px-3.5 py-2 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
                      >
                        {voting ? '…' : hasVoted ? 'Vote instead' : 'Vote'}
                      </button>
                    )}
                    <button
                      onClick={() => goToFilm(film.id)}
                      className="px-3 py-2 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wide bg-[color:var(--surface)] border border-[color:var(--accent)]/40 text-[color:var(--accent)] hover:bg-[#D4A017]/10 transition whitespace-nowrap">
                      Watch
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Vote bar — visual progress */}
            {isVotingOpen && localEntries[0]?.contest_score > 0 && (
              <div className="h-0.5 bg-[color:var(--border)]">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] transition-all duration-500"
                  style={{ width: `${Math.round((entry.contest_score / localEntries[0].contest_score) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )
      })}

    </div>
  )
}
