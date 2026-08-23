'use client'
// Poster tile with Netflix-style hover behaviour: the card lifts + zooms, and
// after a short dwell a muted, looping YouTube preview autoplays — starting at a
// highlight (past the title card). Uses the YouTube IFrame Player API so we can
// seek reliably in onReady (raw postMessage seeks are dropped before the player
// is ready, which is why it played from 0). Kept client-side so FilmRow stays a
// server component.

import { useEffect, useRef, useState } from 'react'
import { loadYouTubeAPI } from '@/lib/youtube'

const HIGHLIGHT = 25 // seconds — skip the intro/title card

export default function FilmPoster({
  vid,
  thumb,
  title,
  hoverBorder,
}: {
  vid: string | null
  thumb: string | null
  title: string
  hoverBorder: string
}) {
  const [preview, setPreview] = useState(false)
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)

  function enter() {
    if (!vid) return
    dwell.current = setTimeout(() => setPreview(true), 650)
  }
  function leave() {
    if (dwell.current) clearTimeout(dwell.current)
    setPreview(false)
  }

  // Build the player only once the preview is armed; tear it down on leave.
  useEffect(() => {
    if (!preview || !vid) return
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
              e.target.seekTo(HIGHLIGHT, true)   // guaranteed-ready seek
              e.target.mute()
              e.target.playVideo()
              const f = e.target.getIframe?.()
              if (f) { f.style.position = 'absolute'; f.style.inset = '0'; f.style.width = '100%'; f.style.height = '100%'; f.style.pointerEvents = 'none' }
            } catch {}
          },
          onStateChange: (e: any) => {
            // On loop-restart, jump back to the highlight instead of the title.
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
  }, [preview, vid])

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      className={`relative aspect-video rounded-lg overflow-hidden border border-white/10 ${hoverBorder} shadow-md origin-bottom-left transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.35] group-hover:shadow-2xl group-hover:border-white/30`}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={title}
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
      )}

      {/* Preview player (YT API injects the iframe here) */}
      {preview && vid && (
        <div className="absolute inset-0 z-[1]">
          <div ref={hostRef} className="w-full h-full" />
        </div>
      )}

      {/* Legibility scrim — fades out while previewing so the clip is clean */}
      <div
        className={`absolute inset-0 z-[2] bg-gradient-to-t from-black/60 to-transparent pointer-events-none transition-opacity duration-300 ${
          preview ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  )
}
