'use client'
// Netflix/Prime-style billboard: a rotating spotlight of featured films with a
// muted autoplaying trailer behind big title + Play / My List / mute controls.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import WatchlistButton from './WatchlistButton'
import { loadYouTubeAPI } from '@/lib/youtube'

const HIGHLIGHT = 35 // seconds — skip the title card

type Film = {
  id: string
  title_en: string
  title_te?: string | null
  description?: string | null
  genre?: string | null
  video_url?: string | null
  view_count?: number | null
  districts?: any
}

function ytId(url?: string | null) {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1] ?? null
}

function hrefFor(f: Film) {
  const d = f.districts as any
  const state = d?.states?.slug ?? 'telangana'
  const district = d?.slug ?? 'hyderabad'
  return `/${state}/${district}/film/${f.id}`
}

const ROTATE_MS = 11000

export default function BillboardHero({ films }: { films: Film[] }) {
  const spotlight = films.filter(f => ytId(f.video_url)).slice(0, 5)
  const [idx, setIdx] = useState(0)
  const [playTrailer, setPlayTrailer] = useState(false)
  const [muted, setMuted] = useState(true)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)
  const rotateRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const film = spotlight[idx]
  const vid = ytId(film?.video_url)

  // Auto-advance the spotlight; also arms the trailer a moment after each slide.
  useEffect(() => {
    if (spotlight.length === 0) return
    setPlayTrailer(false)
    const arm = setTimeout(() => setPlayTrailer(true), 1400)
    rotateRef.current = setTimeout(
      () => setIdx(i => (i + 1) % spotlight.length),
      ROTATE_MS,
    )
    return () => {
      clearTimeout(arm)
      if (rotateRef.current) clearTimeout(rotateRef.current)
    }
  }, [idx, spotlight.length])

  // Build the trailer via the YT IFrame API so the seek fires reliably onReady.
  useEffect(() => {
    if (!playTrailer || !vid) return
    let cancelled = false
    loadYouTubeAPI().then(() => {
      if (cancelled || !hostRef.current) return
      const YT = (window as any).YT
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: vid,
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: vid,
          modestbranding: 1, rel: 0, playsinline: 1, disablekb: 1, start: HIGHLIGHT,
        },
        events: {
          onReady: (e: any) => {
            try {
              e.target.seekTo(HIGHLIGHT, true)
              if (muted) e.target.mute(); else { e.target.unMute(); e.target.setVolume(100) }
              e.target.playVideo()
              const f = e.target.getIframe?.()
              if (f) { f.style.position = 'absolute'; f.style.width = '130%'; f.style.height = '130%'; f.style.left = '-15%'; f.style.top = '-15%'; f.style.pointerEvents = 'none' }
            } catch {}
          },
          onStateChange: (e: any) => {
            if (e.data === 1) { try { if (e.target.getCurrentTime() < HIGHLIGHT - 2) e.target.seekTo(HIGHLIGHT, true) } catch {} }
          },
        },
      })
    })
    return () => {
      cancelled = true
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playTrailer, vid])

  function toggleMute() {
    const p = playerRef.current
    if (!p) return
    if (muted) { p.unMute?.(); p.setVolume?.(100); setMuted(false) }
    else { p.mute?.(); setMuted(true) }
  }

  if (!film) return null

  const d = film.districts as any
  const districtName = d?.name_en ?? ''
  const thumb = vid ? `https://img.youtube.com/vi/${vid}/maxresdefault.jpg` : null

  return (
    <section className="relative min-h-[88vh] flex items-end overflow-hidden">
      {/* Backdrop: thumbnail always, trailer fades in on top */}
      <div className="absolute inset-0 z-0">
        {thumb && (
          <Image
            key={film.id}
            src={thumb}
            alt={film.title_en}
            fill
            priority
            className="object-cover object-center anim-fade-in"
            sizes="100vw"
          />
        )}
        {playTrailer && vid && (
          <div key={`${film.id}-tr`} className="absolute inset-0 overflow-hidden anim-fade-in">
            <div ref={hostRef} className="absolute inset-0" />
          </div>
        )}
        {/* Scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--scrim)] via-[color:var(--scrim)]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--bg)] via-[color:var(--bg)]/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-20 pt-28">
        <div className="max-w-2xl">
          <div key={film.id} className="anim-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#FF6B1A] text-lg font-black tracking-tight">CINEMAVURU</span>
              <span className="text-white/40">·</span>
              <span className="text-white/70 text-xs uppercase tracking-[3px]">Spotlight</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.02] tracking-tight mb-3"
              style={{ fontFamily: "'Georgia', serif", textShadow: '0 4px 32px rgba(0,0,0,0.75)' }}>
              {film.title_en}
            </h1>

            {film.title_te && (
              <p className="text-[#FFC845] text-base mb-3" style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}>
                {film.title_te}
              </p>
            )}

            <div className="flex items-center gap-3 text-white/80 text-sm mb-4 flex-wrap">
              {film.genre && <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15">{film.genre}</span>}
              {districtName && <span>📍 {districtName}</span>}
              {typeof film.view_count === 'number' && <span>👁 {film.view_count.toLocaleString('en-IN')} views</span>}
            </div>

            {film.description && (
              <p className="text-[#E7DCC5] text-base leading-relaxed mb-7 line-clamp-3 max-w-xl"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                {film.description}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <Link href={hrefFor(film)}
                className="inline-flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-white/85 hover:-translate-y-0.5 transition-all shadow-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                Play
              </Link>
              <WatchlistButton filmId={film.id} />
            </div>
          </div>
        </div>

        {/* Slide indicators */}
        {spotlight.length > 1 && (
          <div className="flex items-center gap-2 mt-10">
            {spotlight.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                aria-label={`Show ${s.title_en}`}
                className={`h-1 rounded-full transition-all ${i === idx ? 'w-8 bg-[#FF6B1A]' : 'w-4 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mute toggle */}
      {playTrailer && vid && (
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Unmute trailer' : 'Mute trailer'}
          className="absolute bottom-24 right-6 z-20 w-11 h-11 rounded-full border border-white/40 bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition">
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
          )}
        </button>
      )}
    </section>
  )
}
