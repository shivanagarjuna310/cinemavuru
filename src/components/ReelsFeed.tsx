'use client'
// Vertical, swipeable short-film feed (TikTok/Reels style, tuned for landscape
// short films). Each reel autoplays muted when it scrolls into view; tap the
// video to unmute. No login needed to browse — the "Watch full film" CTA
// converts curious visitors into signups downstream.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

function ytId(url?: string | null) {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1] ?? null
}
function hrefFor(f: any) {
  const d = f?.districts
  return `/${d?.states?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${f.id}`
}
function creatorOf(f: any) {
  return Array.isArray(f?.profiles) ? f.profiles[0] : f?.profiles
}

export default function ReelsFeed({ films }: { films: any[] }) {
  const reels = films.filter((f) => ytId(f.video_url))
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track which reel is centred and make it the active (playing) one.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i)
            if (!Number.isNaN(i)) { setActive(i); setMuted(true) }
          }
        })
      },
      { threshold: 0.6 },
    )
    itemRefs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [reels.length])

  function send(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }), '*',
    )
  }
  function toggleMute() {
    if (muted) { send('unMute'); send('setVolume', [100]); setMuted(false) }
    else { send('mute'); setMuted(true) }
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-white/70">No clips yet.</p>
        <Link href="/" className="underline">Back home</Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/" className="text-white flex items-center gap-2 group" aria-label="Back home">
          <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </span>
          <span className="font-black tracking-tight text-sm">CINEMAVURU</span>
        </Link>
        <span className="text-white/60 text-xs uppercase tracking-[4px]">Reels</span>
      </div>

      {/* Feed */}
      <div className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {reels.map((f, i) => {
          const vid = ytId(f.video_url)
          const thumb = `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`
          const thumbFallback = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
          const creator = creatorOf(f)
          const d = f.districts
          const isActive = i === active
          return (
            <div
              key={f.id}
              data-i={i}
              ref={(el) => { itemRefs.current[i] = el }}
              className="relative h-[100dvh] snap-start snap-always flex items-center justify-center overflow-hidden px-3 sm:px-6"
            >
              {/* Blurred backdrop */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbFallback} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 opacity-30" />
              <div className="absolute inset-0 bg-black/40" />

              {/* Centered player card + info */}
              <div className="relative z-10 w-full max-w-3xl">
                <div
                  className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-pointer"
                  onClick={isActive ? toggleMute : undefined}
                >
                  {isActive && vid ? (
                    <iframe
                      ref={iframeRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      src={`https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&controls=0&loop=1&playlist=${vid}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                      allow="autoplay; encrypted-media"
                      title={f.title_en}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={f.title_en} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 pr-16 sm:pr-0">
                  {creator?.id ? (
                    <Link href={`/creator/${creator.id}`} className="inline-flex items-center gap-2 text-white/90 text-sm font-semibold hover:text-white">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black text-[11px] font-bold">
                        {(creator?.name ?? 'F')[0].toUpperCase()}
                      </span>
                      @{creator?.name ?? 'filmmaker'}
                    </Link>
                  ) : (
                    <span className="text-white/80 text-sm font-semibold">@{creator?.name ?? 'filmmaker'}</span>
                  )}
                  <h2 className="text-white text-xl sm:text-2xl font-bold mt-2 leading-tight" style={{ fontFamily: "'Georgia', serif" }}>
                    {f.title_en}
                  </h2>
                  <div className="flex items-center gap-2 text-white/70 text-xs mt-2 flex-wrap">
                    {f.genre && <span className="px-2 py-0.5 rounded-full bg-white/12 border border-white/15">{f.genre}</span>}
                    {d?.name_en && <span>📍 {d.name_en}</span>}
                    {typeof f.view_count === 'number' && <span>👁 {f.view_count.toLocaleString('en-IN')}</span>}
                  </div>
                  <Link href={hrefFor(f)}
                    className="inline-flex items-center gap-2 mt-4 bg-white text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide hover:bg-white/85 hover:-translate-y-0.5 transition-all shadow-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    Watch full film
                  </Link>
                </div>
              </div>

              {/* Right action rail */}
              <ReelActions film={f} onMuteToggle={toggleMute} muted={muted} isActive={isActive} />
            </div>
          )
        })}
      </div>

      {/* Swipe hint on the first reel */}
      {active === 0 && reels.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 text-white/50 pointer-events-none animate-bounce">
          <span className="text-[10px] uppercase tracking-[3px]">Swipe up</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
        </div>
      )}
    </div>
  )
}

function ReelActions({ film, onMuteToggle, muted, isActive }: {
  film: any; onMuteToggle: () => void; muted: boolean; isActive: boolean
}) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState<number>(film.like_count ?? 0)

  async function like() {
    if (!user) { window.location.href = '/auth'; return }
    if (liked) {
      const { error } = await supabase.from('likes').delete().eq('user_id', user.id).eq('film_id', film.id)
      if (!error) { setLiked(false); setLikes((c) => Math.max(0, c - 1)) }
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: user.id, film_id: film.id })
      if (!error || error.code === '23505') { setLiked(true); setLikes((c) => c + 1) }
    }
  }

  async function share() {
    const url = `${window.location.origin}${hrefFor(film)}`
    const text = 'Watch this short film on CinemaVuru 🎬'
    if (navigator.share) { try { await navigator.share({ title: film.title_en, text, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(url) } catch {} }
  }

  const btn = 'w-12 h-12 rounded-full bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/25 hover:scale-105 transition'

  return (
    <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <button onClick={like} className={btn} aria-label="Like">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? '#FF6B1A' : 'none'} stroke={liked ? '#FF6B1A' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></svg>
        </button>
        <span className="text-white text-xs tabular-nums font-semibold">{likes}</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <button onClick={share} className={btn} aria-label="Share">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>
        </button>
        <span className="text-white/70 text-[10px] uppercase tracking-wide">Share</span>
      </div>

      {isActive && (
        <button onClick={onMuteToggle} className={btn} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
          )}
        </button>
      )}
    </div>
  )
}
