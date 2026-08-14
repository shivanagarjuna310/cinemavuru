'use client'
// Metered soft wall: anonymous visitors watch a couple of films free, then the
// player asks them to sign in. Logged-in users watch unlimited. The page itself
// stays public (title/description/thumbnail) so search + sharing keep bringing
// new people in — the gate only nudges engaged viewers to create an account.
//
// Note: this is a growth nudge, not DRM. The metering lives in localStorage, so
// it's intentionally soft (incognito bypasses it). Real content protection would
// mean moving off public YouTube embeds.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'

const FREE_LIMIT = 2
const STORAGE_KEY = 'cv_watched'

export default function FilmPlayer({
  videoUrl,
  filmId,
  emoji,
}: {
  videoUrl: string | null
  filmId: string
  emoji: string
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

  return (
    <iframe
      src={`${videoUrl}?rel=0`}
      className="w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}
