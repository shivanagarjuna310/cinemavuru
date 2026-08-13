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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
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

  // Authoritative like count from the likes table (reflects everyone's likes)
  async function refreshLikeCount() {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('film_id', filmId)
    if (typeof count === 'number') setLikeCount(count)
  }

  // Keep the count live: recount when anyone likes/unlikes this film (realtime),
  // and when the tab regains focus (reliable fallback if realtime is off).
  useEffect(() => {
    refreshLikeCount()
    const channel = supabase
      .channel(`likes-${filmId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `film_id=eq.${filmId}` },
        () => refreshLikeCount(),
      )
      .subscribe()

    const onFocus = () => { if (document.visibilityState === 'visible') refreshLikeCount() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleShare() {
    const url = window.location.href
    // Mobile: native share sheet (WhatsApp, Instagram, etc.)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: 'Watch this short film on CinemaVuru 🎬',
          url,
        })
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return
    }
    // Desktop fallback: copy the link
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const isMyVote = votedFilmId === filmId

  const pill = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ring-1 transition-all'

  return (
    <div className="flex items-center gap-2.5 py-4 border-t border-b border-[color:var(--border)] mb-6 flex-wrap">

      {/* Like */}
      <button onClick={handleLike} disabled={loading} aria-pressed={liked}
        className={`${pill} disabled:opacity-60 ${
          liked
            ? 'bg-[#FF6B1A]/15 text-[color:var(--accent-hot)] ring-[color:var(--accent-hot)]/40'
            : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent-hot)] hover:ring-[color:var(--accent-hot)]/40'
        }`}>
        <HeartIcon filled={liked} />
        <span className="tabular-nums">{likeCount}</span>
        <span className="hidden sm:inline font-medium opacity-80">{likeCount === 1 ? 'Like' : 'Likes'}</span>
      </button>

      {/* Vote — only shows when film is in voting contest */}
      {isContestFilm && (
        <button
          onClick={handleVote}
          disabled={voting || hasVoted}
          title={hasVoted && !isMyVote ? 'You already voted for another film' : ''}
          className={`${pill} ${
            isMyVote
              ? 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/40 cursor-default'
              : hasVoted
              ? 'bg-[color:var(--surface)] text-[color:var(--faint)] ring-[color:var(--border)] cursor-not-allowed opacity-50'
              : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40'
          }`}>
          <span aria-hidden>🗳️</span>
          <span className="tabular-nums">{voteCount}</span>
          <span className="hidden sm:inline font-medium opacity-80">
            {isMyVote ? 'Your vote' : hasVoted ? 'Voted' : 'Vote'}
          </span>
        </button>
      )}

      {/* Share — native share sheet on mobile, copy-link fallback on desktop */}
      <button onClick={handleShare} aria-label="Share this film" title="Share this film"
        className={`${pill} sm:ml-auto ${
          copied
            ? 'bg-[#25D366]/10 text-[#25D366] ring-[#25D366]/40'
            : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40'
        }`}>
        {copied ? <CheckIcon /> : <ShareIcon />}
        <span>{copied ? 'Link copied' : 'Share'}</span>
      </button>

    </div>
  )
}