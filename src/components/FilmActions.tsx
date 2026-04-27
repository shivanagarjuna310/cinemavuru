'use client'
// src/components/FilmActions.tsx

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { logger }              from '@/lib/logger'

type Props = {
  filmId:       string
  initialLikes: number
  stateSlug:    string
  districtSlug: string
}

export default function FilmActions({ filmId, initialLikes, stateSlug, districtSlug }: Props) {
  const [liked,        setLiked]        = useState(false)
  const [likeCount,    setLikeCount]    = useState(initialLikes)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [copied,       setCopied]       = useState(false)
  // ── Voting state ─────────────────────────────────────────
  const [contestId,    setContestId]    = useState<string | null>(null)
  const [hasVoted,     setHasVoted]     = useState(false)
  const [votedFilmId,  setVotedFilmId]  = useState<string | null>(null)
  const [voteCount,    setVoteCount]    = useState(0)
  const [voting,       setVoting]       = useState(false)
  const [isContestFilm, setIsContestFilm] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        // Check if user liked this film
        const { data: likeData } = await supabase
          .from('likes')
          .select('film_id')
          .eq('user_id', user.id)
          .eq('film_id', filmId)
          .maybeSingle()
        if (likeData) setLiked(true)
      }

      // Check if this film is in an active voting contest
      const { data: contest } = await supabase
        .from('contests')
        .select('id')
        .eq('status', 'voting')
        .limit(1)
        .single()

      if (!contest) return

      // Check if this film is an approved entry in that contest
      const { data: entry } = await supabase
        .from('contest_entries')
        .select('id, contest_score')
        .eq('contest_id', contest.id)
        .eq('film_id', filmId)
        .eq('is_approved', true)
        .eq('payment_status', 'paid')
        .maybeSingle()

      if (!entry) return

      setIsContestFilm(true)
      setContestId(contest.id)
      setVoteCount(entry.contest_score)

      // Check if user already voted in this contest
      if (user) {
        const { data: vote } = await supabase
          .from('contest_votes')
          .select('film_id')
          .eq('contest_id', contest.id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (vote) {
          setHasVoted(true)
          setVotedFilmId(vote.film_id)
        }
      }
    }
    init()
  }, [filmId])

  async function handleLike() {
    if (!userId) { window.location.href = '/auth'; return }
    if (loading) return
    setLoading(true)
    const start = Date.now()

    if (liked) {
      const { error } = await supabase
        .from('likes').delete()
        .eq('user_id', userId).eq('film_id', filmId)
      if (!error) {
        await logger.info('FilmActions', 'handleLike', 'Film unliked', {
          filmId, userId, duration_ms: Date.now() - start
        })
        setLiked(false)
        setLikeCount(c => c - 1)
      }
    } else {
      const { error } = await supabase
        .from('likes').insert({ user_id: userId, film_id: filmId })
      if (!error) {
        await logger.info('FilmActions', 'handleLike', 'Film liked', {
          filmId, userId, duration_ms: Date.now() - start
        })
        setLiked(true)
        setLikeCount(c => c + 1)
      }
    }
    setLoading(false)
  }

  async function handleVote() {
    if (!userId)  { window.location.href = '/auth'; return }
    if (voting || hasVoted || !contestId) return

    setVoting(true)
    const { error } = await supabase
      .from('contest_votes')
      .insert({ contest_id: contestId, user_id: userId, film_id: filmId })

    if (!error) {
      // Update contest_score on the entry
      await supabase.rpc('increment_contest_score', {
        p_contest_id: contestId,
        p_film_id:    filmId,
      })
      setHasVoted(true)
      setVotedFilmId(filmId)
      setVoteCount(c => c + 1)
    } else {
      alert(error.code === '23505'
        ? 'You have already voted in this contest!'
        : `Vote failed: ${error.message}`)
    }
    setVoting(false)
  }

  function handleWhatsApp() {
    const url  = encodeURIComponent(window.location.href)
    const text = encodeURIComponent('Watch this short film on CinemaVuru 🎬')
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isMyVote = votedFilmId === filmId

  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#2E2010] mb-6 flex-wrap">

      {/* Like */}
      <button onClick={handleLike} disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60 ${
          liked
            ? 'bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FF6B1A]'
            : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#FF6B1A] hover:border-[#FF6B1A]/30'
        }`}>
        {liked ? '♥' : '♡'}
        <span>{likeCount} {liked ? 'Liked!' : 'Like'}</span>
      </button>

      {/* Vote — only shows when film is in voting contest */}
      {isContestFilm && (
        <button
          onClick={handleVote}
          disabled={voting || hasVoted}
          title={hasVoted && !isMyVote ? 'You already voted for another film' : ''}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${
            isMyVote
              ? 'bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#D4A017] cursor-default'
              : hasVoted
              ? 'bg-[#1A1208] border border-[#2E2010] text-[#4A3020] cursor-not-allowed opacity-40'
              : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] hover:border-[#D4A017]/30 cursor-pointer'
          }`}>
          🗳️
          <span>
            {isMyVote
              ? `✓ Your Vote · ${voteCount}`
              : hasVoted
              ? `Voted · ${voteCount}`
              : `Vote · ${voteCount}`}
          </span>
        </button>
      )}

      {/* WhatsApp */}
      <button onClick={handleWhatsApp}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#25D366] hover:border-[#25D366]/30 transition-all">
        📱 WhatsApp
      </button>

      {/* Copy */}
      <button onClick={handleCopy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] hover:border-[#D4A017]/30 transition-all">
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>

    </div>
  )
}