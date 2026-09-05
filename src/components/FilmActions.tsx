'use client'
// src/components/FilmActions.tsx

import { useState, useEffect, useRef } from 'react'
import { supabase }            from '@/lib/supabase'
import { logger }              from '@/lib/logger'
import { useAuth }             from './AuthProvider'

// Never recount the likes table more than once per this window per mount.
const COUNT_THROTTLE_MS = 30_000

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
function BallotIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="8" width="18" height="13" rx="2" fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.18 : 0} />
      <path d="M8 8V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4" />
      {filled ? <path d="M9 14l2 2 4-4" /> : <path d="M12 12v4M10 14h4" />}
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  )
}
export default function FilmActions({ filmId, initialLikes, stateSlug, districtSlug }: Props) {
  const [liked,        setLiked]        = useState(false)
  const [likeCount,    setLikeCount]    = useState(initialLikes)
  const { user }                        = useAuth()
  const userId = user?.id ?? null
  const [loading,      setLoading]      = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [linkCopied,   setLinkCopied]   = useState(false)
  // ── Voting state ─────────────────────────────────────────
  const [contestId,    setContestId]    = useState<string | null>(null)
  const [hasVoted,     setHasVoted]     = useState(false)
  const [votedFilmId,  setVotedFilmId]  = useState<string | null>(null)
  const [voteCount,    setVoteCount]    = useState(0)
  const [voting,       setVoting]       = useState(false)
  const [isContestFilm, setIsContestFilm] = useState(false)

  // Reacts to the shared auth user — re-runs on login/logout automatically.
  useEffect(() => {
    let cancelled = false
    async function init() {
      // Reset user-specific state (also handles logout)
      setLiked(false)
      setHasVoted(false)
      setVotedFilmId(null)

      if (userId) {
        const { data: likeData } = await supabase
          .from('likes').select('film_id')
          .eq('user_id', userId).eq('film_id', filmId).maybeSingle()
        if (!cancelled && likeData) setLiked(true)
      }

      // Is this film in an active voting contest?
      const { data: contest } = await supabase
        .from('contests').select('id').eq('status', 'voting').limit(1).single()
      if (cancelled || !contest) return

      const { data: entry } = await supabase
        .from('contest_entries').select('id, contest_score')
        .eq('contest_id', contest.id).eq('film_id', filmId)
        .eq('is_approved', true).eq('payment_status', 'paid').maybeSingle()
      if (cancelled || !entry) return

      setIsContestFilm(true)
      setContestId(contest.id)
      setVoteCount(entry.contest_score)

      if (userId) {
        const { data: vote } = await supabase
          .from('contest_votes').select('film_id')
          .eq('contest_id', contest.id).eq('user_id', userId).maybeSingle()
        if (!cancelled && vote) {
          setHasVoted(true)
          setVotedFilmId(vote.film_id)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [filmId, userId])

  // Authoritative like count from the likes table (reflects everyone's likes).
  // Throttled: this used to run on every realtime event AND twice per tab
  // switch, so a film with N viewers cost N count queries per like. On the
  // Supabase free tier that burns the disk-IO budget for no benefit.
  const lastCountAt = useRef(0)
  async function refreshLikeCount(opts?: { force?: boolean }) {
    const now = Date.now()
    if (!opts?.force && now - lastCountAt.current < COUNT_THROTTLE_MS) return
    lastCountAt.current = now
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('film_id', filmId)
    if (typeof count === 'number') setLikeCount(count)
  }

  // NO realtime subscription here, on purpose.
  //
  // `likes` is NOT in the supabase_realtime publication (only `comments` is),
  // verified directly against the database. So a postgres_changes subscription
  // on `likes` could never deliver a single event — but it still made Realtime
  // insert and delete a row in realtime.subscription on every film page view.
  // Measured cost of that churn: 4,709 inserts + 4,708 deletes + 113,581
  // sequential scans on realtime.subscription, and Realtime's own publication
  // bookkeeping queries burned ~8,400 dirtied blocks over ~335s of execution.
  // That was pure Disk IO for zero benefit.
  //
  // The throttled recount below is what actually keeps the count fresh, which
  // is all the realtime path was ever achieving here anyway.
  useEffect(() => {
    refreshLikeCount({ force: true })

    // `focus` and `visibilitychange` both fire when returning to a tab — one
    // listener is enough, and it's throttled anyway.
    const onVisible = () => { if (document.visibilityState === 'visible') refreshLikeCount() }
    document.addEventListener('visibilitychange', onVisible)

    return () => { document.removeEventListener('visibilitychange', onVisible) }
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
    if (voting || !contestId) return

    // Withdraw when this is already my vote, otherwise cast/move it. Goes
    // through /api/contest/vote so the score is recomputed from a real count
    // rather than incremented — the old path could never be undone and its
    // running counter drifted whenever a call failed.
    const action = isMyVote ? 'unvote' : 'vote'
    setVoting(true)
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
      if (!res.ok) { alert(j.error || 'Vote failed. Please try again.'); return }

      setVotedFilmId(j.votedFilmId ?? null)
      setHasVoted(Boolean(j.votedFilmId))
      if (typeof j.scores?.[filmId] === 'number') setVoteCount(j.scores[filmId])
    } catch {
      alert('Network problem — please try again.')
    } finally {
      setVoting(false)
    }
  }

  async function handleShare() {
    const url = window.location.href
    // Contest films → recruit votes; otherwise a normal watch share.
    const text = isContestFilm
      ? '🗳️ Vote for my film on CinemaVuru — every vote counts! 🙏'
      : 'Watch this short film on CinemaVuru 🎬'
    // Mobile: native share sheet (WhatsApp, Instagram, etc.)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: document.title, text, url })
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

  // Copies ONLY the raw URL — no title/description bundled in.
// Needed separately from handleShare because the native share sheet's
// own "copy" action bundles title + text + url together, which breaks
// Instagram's "Add Link" sticker (it requires a plain URL, not a text blob).
async function handleCopyLink() {
  const url = window.location.href
  try {
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  } catch {
    setLinkCopied(false)
  }
}
  
  const isMyVote = votedFilmId === filmId

  const pill = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ring-1 transition-all'

  return (
    <div className="py-4 border-t border-b border-[color:var(--border)] mb-6">

      {/* Voting banner — on a phone the button alone was just an icon and a
          number, so the fact that this film is IN a contest, and whether you
          had voted, was invisible. State it in words. */}
      {isContestFilm && (
        <div className={`mb-3 rounded-xl px-3.5 py-2.5 text-sm flex items-center gap-2 ${
          isMyVote
            ? 'bg-[#D4A017]/12 ring-1 ring-[color:var(--accent)]/40 text-[color:var(--accent)]'
            : hasVoted
            ? 'bg-[color:var(--surface)] ring-1 ring-[color:var(--border)] text-[color:var(--muted)]'
            : 'bg-[#FF6B1A]/10 ring-1 ring-[color:var(--accent-hot)]/35 text-[color:var(--accent-hot)]'
        }`}>
          <span className="shrink-0"><BallotIcon filled={isMyVote} /></span>
          <span className="font-semibold">
            {isMyVote
              ? 'You voted for this film — tap the vote button to undo'
              : hasVoted
              ? 'You already voted for another film this season'
              : 'This film is in the contest — your vote decides the winner'}
          </span>
        </div>
      )}

      {/* Mobile: a 2-up grid so every control has a readable width.
          Desktop: the original single row. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">

      {/* Like */}
      <button onClick={handleLike} disabled={loading} aria-pressed={liked}
        className={`${pill} disabled:opacity-60 ${
          liked
            ? 'bg-[#FF6B1A]/15 text-[color:var(--accent-hot)] ring-[color:var(--accent-hot)]/40'
            : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent-hot)] hover:ring-[color:var(--accent-hot)]/40'
        }`}>
        <HeartIcon filled={liked} />
        <span className="tabular-nums">{likeCount}</span>
        <span className="font-medium opacity-80">{likeCount === 1 ? 'Like' : 'Likes'}</span>
      </button>

      {/* Vote — only shows when film is in voting contest */}
      {isContestFilm && (
        <button
          onClick={handleVote}
          disabled={voting || (hasVoted && !isMyVote)}
          title={
            isMyVote
              ? 'Tap to withdraw your vote'
              : hasVoted
              ? 'You already voted for another film this season'
              : 'Vote for this film'
          }
          className={`${pill} ${
            isMyVote
              ? 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/40 hover:ring-[color:var(--accent)]/70'
              : hasVoted
              ? 'bg-[color:var(--surface)] text-[color:var(--faint)] ring-[color:var(--border)] cursor-not-allowed opacity-50'
              : 'bg-[#FF6B1A]/12 text-[color:var(--accent-hot)] ring-[color:var(--accent-hot)]/45 hover:bg-[#FF6B1A]/20'
          }`}>
          <BallotIcon filled={isMyVote} />
          <span className="tabular-nums">{voteCount}</span>
          <span className="font-medium opacity-80">
            {isMyVote
              ? (voting ? 'Removing…' : 'Your vote · Undo')
              : hasVoted
              ? 'Voted elsewhere'
              : voting ? 'Voting…' : 'Vote'}
          </span>
        </button>
      )}

      {/* Share — for contest films this becomes a "Get Votes" recruitment share */}
      <button onClick={handleShare}
        aria-label={isContestFilm ? 'Share to get votes' : 'Share this film'}
        title={isContestFilm ? 'Share to get votes' : 'Share this film'}
        className={`${pill} justify-center col-span-2 sm:col-span-1 sm:ml-auto ${
          copied
            ? 'bg-[#25D366]/10 text-[#25D366] ring-[#25D366]/40'
            : isContestFilm
            ? 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black ring-transparent hover:opacity-90'
            : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40'
        }`}>
        {copied ? <CheckIcon /> : <ShareIcon />}
        <span>{copied ? 'Link copied' : isContestFilm ? 'Get Votes' : 'Share'}</span>
      </button>
      {/* Copy Link — dedicated raw-URL copy, safe to paste into Instagram's
    "Add Link" sticker or anywhere else that needs a plain URL */}
<button onClick={handleCopyLink}
  aria-label="Copy plain link (for Instagram Story link sticker, etc.)"
  title="Copy plain link — use this for Instagram's Add Link sticker"
  className={`${pill} justify-center col-span-2 sm:col-span-1 ${
    linkCopied
      ? 'bg-[#25D366]/10 text-[#25D366] ring-[#25D366]/40'
      : 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40'
  }`}>
  {linkCopied ? <CheckIcon /> : <LinkIcon />}
  <span>{linkCopied ? 'Copied' : 'Copy Link'}</span>
</button>
      </div>
    </div>
  )
}