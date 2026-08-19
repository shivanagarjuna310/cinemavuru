'use client'
// Metered soft wall: anonymous visitors watch a couple of films free, then the
// player asks them to sign in. Logged-in users watch unlimited. The page itself
// stays public (title/description/thumbnail) so search + sharing keep bringing
// new people in — the gate only nudges engaged viewers to create an account.
//
// The player uses the YouTube IFrame API so we can: resume where you left off,
// save Continue-Watching progress, default captions on, and autoplay the next
// film when one ends. Metering still lives in localStorage (intentionally soft).

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { loadYouTubeAPI, ytIdFromUrl } from '@/lib/youtube'
import { saveProgress, getProgress } from '@/lib/watchProgress'

const FREE_LIMIT = 2
const STORAGE_KEY = 'cv_watched'

type NextFilm = { href: string; title: string; thumb: string | null } | null

export default function FilmPlayer({
  videoUrl,
  filmId,
  emoji,
  nextFilm = null,
}: {
  videoUrl: string | null
  filmId: string
  emoji: string
  nextFilm?: NextFilm
}) {
  const { user, loading } = useAuth()
  const [gated, setGated] = useState(false)

  useEffect(() => {
    if (loading) return          // wait for the shared auth to resolve
    if (user) { setGated(false); return }  // logged-in → unlimited

    // Anonymous → meter distinct films via localStorage
    let watched: string[] = []
    try {
      watched = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      watched = []
    }
    if (watched.includes(filmId)) { setGated(false); return } // already unlocked

    if (watched.length < FREE_LIMIT) {
      watched.push(filmId)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watched)) } catch {}
      setGated(false)
      return
    }
    setGated(true)
  }, [filmId, user, loading])

  // No video uploaded yet
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <div className="text-8xl">{emoji}</div>
        <p className="text-[color:var(--text)]/60 text-sm">Video coming soon</p>
      </div>
    )
  }

  // Over the free limit → signup nudge instead of the player
  if (gated) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4 px-6 bg-black/75 backdrop-blur-sm">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="#000" strokeWidth="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className="text-white text-lg font-bold" style={{ fontFamily: "'Georgia', serif" }}>
            Enjoying local cinema?
          </h3>
          <p className="text-white/70 text-sm mt-1 max-w-sm">
            You&apos;ve watched your {FREE_LIMIT} free films. Sign in — it&apos;s free — to keep
            watching short films from across your district.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/auth"
            className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm hover:opacity-90 transition">
            Join Free
          </Link>
          <Link href="/auth"
            className="border border-white/30 text-white px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide text-sm hover:bg-white/10 transition">
            Log In
          </Link>
        </div>
        <p className="text-white/40 text-[11px]">Free forever · No card needed</p>
      </div>
    )
  }

  const vid = ytIdFromUrl(videoUrl)
  if (!vid) {
    // Not a recognisable YouTube URL — fall back to a plain embed.
    return (
      <iframe
        src={`${videoUrl}?rel=0`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  return <YouTubePlayer vid={vid} filmId={filmId} userId={user?.id ?? null} nextFilm={nextFilm} />
}

function YouTubePlayer({
  vid,
  filmId,
  userId,
  nextFilm,
}: {
  vid: string
  filmId: string
  userId: string | null
  nextFilm: NextFilm
}) {
  const router = useRouter()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [ended, setEnded] = useState(false)
  const [countdown, setCountdown] = useState(8)

  // Persist current position (logged-in users only).
  function persist() {
    const p = playerRef.current
    if (!userId || !p?.getCurrentTime) return
    try {
      const pos = p.getCurrentTime()
      const dur = p.getDuration?.() ?? null
      if (pos > 0) saveProgress(userId, filmId, pos, dur)
    } catch {}
  }

  useEffect(() => {
    let cancelled = false

    loadYouTubeAPI().then(async () => {
      if (cancelled || !hostRef.current) return
      const resumeAt = userId ? await getProgress(userId, filmId) : 0
      if (cancelled || !hostRef.current) return
      const YT = (window as any).YT

      playerRef.current = new YT.Player(hostRef.current, {
        videoId: vid,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          cc_load_policy: 1,   // captions on by default when the video has them
          start: Math.floor(resumeAt),
        },
        events: {
          onStateChange: (e: any) => {
            // 1 = playing, 0 = ended, 2 = paused
            if (e.data === 1) {
              if (!saveTimer.current) saveTimer.current = setInterval(persist, 10000)
            } else {
              if (saveTimer.current) { clearInterval(saveTimer.current); saveTimer.current = null }
              persist()
              if (e.data === 0 && nextFilm) setEnded(true)
            }
          },
        },
      })
    })

    const onHide = () => { if (document.visibilityState === 'hidden') persist() }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onHide)
      if (saveTimer.current) clearInterval(saveTimer.current)
      persist()
      try { playerRef.current?.destroy?.() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid, filmId, userId])

  // Up-next countdown after a film ends
  useEffect(() => {
    if (!ended || !nextFilm) return
    if (countdown <= 0) { router.push(nextFilm.href); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [ended, countdown, nextFilm, router])

  return (
    <>
      <div ref={hostRef} className="w-full h-full" />

      {ended && nextFilm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/85 backdrop-blur-sm px-6 text-center">
          <p className="text-white/60 text-xs uppercase tracking-[3px]">Up next in {countdown}s</p>
          <Link href={nextFilm.href} className="group flex flex-col items-center gap-3">
            {nextFilm.thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nextFilm.thumb} alt="" className="w-56 aspect-video object-cover rounded-lg border border-white/20 group-hover:border-[#FF6B1A] transition" />
            )}
            <span className="text-white font-bold text-lg group-hover:text-[#FFC845] transition" style={{ fontFamily: "'Georgia', serif" }}>
              {nextFilm.title}
            </span>
          </Link>
          <div className="flex gap-3">
            <Link href={nextFilm.href}
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-white/85 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              Play now
            </Link>
            <button onClick={() => setEnded(false)}
              className="border border-white/30 text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-white/10 transition">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  )
}
