'use client'
// src/components/ContestFilmGrid.tsx
// Shows contest film entries with rank, score and vote button
// Voting: 1 vote per user per contest — locked once cast, cannot be changed

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'

type Entry = {
  id:            string
  contest_id:    string
  film_id:       string
  contest_score: number
  films: {
    id:          string
    title_en:    string
    title_te:    string | null
    genre:       string | null
    view_count:  number
    like_count:  number
    video_url:   string | null
    profiles:    { name: string | null } | null
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
  Default:     { emoji: '🎬', gradient: 'from-[#1A1208] to-[#2E2010]'  },
}

const RANK_STYLE = [
  'text-[#FFD700] text-xl',  // 1st - gold
  'text-[#C0C0C0] text-lg',  // 2nd - silver
  'text-[#CD7F32] text-lg',  // 3rd - bronze
]

export default function ContestFilmGrid({ entries, contestId, isVotingOpen }: Props) {
  const router = useRouter()
  const [userId,        setUserId]        = useState<string | null>(null)
  const [votedFilmId,   setVotedFilmId]   = useState<string | null>(null)
  const [hasVoted,      setHasVoted]      = useState(false) // ← locked once true
  const [voting,        setVoting]        = useState(false)
  const [localEntries,  setLocalEntries]  = useState(entries)

  // Get user + their existing vote
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: vote } = await supabase
        .from('contest_votes')
        .select('film_id')
        .eq('contest_id', contestId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (vote) {
        setVotedFilmId(vote.film_id)
        setHasVoted(true) // ← already voted, lock it
      }
    }
    init()
  }, [contestId])

  async function handleVote(filmId: string) {
    if (!userId)  { router.push('/auth'); return }
    if (voting)   return
    if (hasVoted) return // ← vote is locked, do nothing

    setVoting(true)

    const { error } = await supabase
      .from('contest_votes')
      .insert({ contest_id: contestId, user_id: userId, film_id: filmId })

    if (!error) {
      setVotedFilmId(filmId)
      setHasVoted(true) // ← lock the vote immediately

      // Update score locally (+1 vote)
      setLocalEntries(prev => prev.map(e =>
        e.film_id === filmId
          ? { ...e, contest_score: e.contest_score + 1 }
          : e
      ).sort((a, b) => b.contest_score - a.contest_score))
    }

    setVoting(false)
  }

  function goToFilm(filmId: string) {
    router.push(`/telangana/hyderabad/film/${filmId}`)
  }

  return (
    <div className="space-y-4">

      {/* Voting info banner */}
      {isVotingOpen && (
        <div className="bg-[#1A1208] border border-[#2E2010] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🗳️</span>
          <div className="text-sm">
            {hasVoted ? (
              <span className="text-[#D4A017] font-semibold">
                You have cast your vote! ✓ — Votes are final and cannot be changed.
              </span>
            ) : userId ? (
              <span className="text-[#7A6040]">
                You have <span className="text-[#FDF6E3] font-semibold">1 vote</span> — choose wisely! Once cast, your vote is final.
              </span>
            ) : (
              <span className="text-[#7A6040]">
                <a href="/auth" className="text-[#D4A017] hover:underline">Login</a> to cast your vote. Each user gets 1 vote per contest.
              </span>
            )}
          </div>
        </div>
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
            className={`bg-[#1A1208] border rounded-xl overflow-hidden transition-all duration-300 ${
              rank === 1 ? 'border-[#FFD700]/30' :
              rank === 2 ? 'border-[#C0C0C0]/20' :
              rank === 3 ? 'border-[#CD7F32]/20' :
              'border-[#2E2010]'
            } ${isMyVote ? 'ring-1 ring-[#D4A017]/30' : ''}`}
          >
            <div className="flex items-center gap-4 p-4">

              {/* Rank */}
              <div className={`text-center w-8 flex-shrink-0 font-bold ${RANK_STYLE[rank - 1] ?? 'text-[#7A6040] text-base'}`}>
                {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
              </div>

              {/* Thumbnail */}
              <div
                onClick={() => goToFilm(film.id)}
                className={`relative w-28 h-16 rounded-lg overflow-hidden bg-gradient-to-br ${style.gradient} flex items-center justify-center text-2xl cursor-pointer flex-shrink-0 group`}
              >
                {style.emoji}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm">▶</span>
                </div>
              </div>

              {/* Film info */}
              <div className="flex-1 min-w-0">
                <h3
                  onClick={() => goToFilm(film.id)}
                  className="font-bold text-[#FDF6E3] text-sm cursor-pointer hover:text-[#D4A017] transition line-clamp-1 mb-0.5"
                >
                  {film.title_en}
                </h3>
                {film.title_te && (
                  <p className="text-[#7A6040] text-xs mb-1">{film.title_te}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-[#7A6040]">
                  <span>{film.profiles?.name ?? 'Creator'}</span>
                  <span>·</span>
                  <span>{film.genre}</span>
                  <span>·</span>
                  <span>♥ {film.like_count}</span>
                  <span>·</span>
                  <span>👁 {film.view_count}</span>
                </div>
              </div>

              {/* Vote count */}
              <div className="text-center flex-shrink-0">
                <div className="text-xl font-bold text-[#D4A017]">{entry.contest_score}</div>
                <div className="text-[10px] text-[#7A6040] uppercase tracking-wide">Votes</div>
              </div>

              {/* Vote button */}
              {isVotingOpen && (
                <button
                  onClick={() => handleVote(entry.film_id)}
                  disabled={voting || hasVoted}
                  title={hasVoted && !isMyVote ? 'You have already voted' : ''}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                    isMyVote
                      ? 'bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#D4A017] cursor-default'
                      : hasVoted
                      ? 'bg-[#1A1208] border border-[#2E2010] text-[#4A3020] cursor-not-allowed opacity-40'
                      : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:border-[#D4A017]/40 hover:text-[#D4A017] cursor-pointer'
                  }`}
                >
                  {isMyVote ? '✓ Your Vote' : 'Vote'}
                </button>
              )}

            </div>

            {/* Vote bar — visual progress */}
            {isVotingOpen && localEntries[0]?.contest_score > 0 && (
              <div className="h-0.5 bg-[#2E2010]">
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
