'use client'
// Poster tile with Netflix-style hover behaviour: the card lifts + zooms, and
// after a short dwell a muted, looping YouTube preview autoplays in place.
// Kept as its own client component so FilmRow can stay a server component.

import { useRef, useState } from 'react'
import Image from 'next/image'

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  function enter() {
    if (!vid) return
    timer.current = setTimeout(() => setPreview(true), 650)
  }
  function leave() {
    if (timer.current) clearTimeout(timer.current)
    setPreview(false)
  }

  // Autoplay is only permitted while muted, so we start muted then ask the
  // YouTube player to unmute once it's actually playing (browsers still gate
  // this on the visitor having interacted with the page at least once).
  function send(func: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    )
  }
  function unmute() {
    send('unMute')
    send('setVolume', [100])
  }

  return (
    <div
      onMouseEnter={enter}
      onMouseLeave={leave}
      className={`relative aspect-video rounded-lg overflow-hidden border border-white/10 ${hoverBorder} shadow-md origin-bottom-left transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-[1.35] group-hover:shadow-2xl group-hover:border-white/30`}
    >
      {thumb ? (
        <Image
          src={thumb}
          alt={title}
          fill
          sizes="224px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-[color:var(--surface)] flex items-center justify-center text-2xl">🎬</div>
      )}

      {/* Looping preview — appears after the hover dwell. Starts muted so it can
          autoplay, then unmutes via the YouTube iframe API once it's running. */}
      {preview && vid && (
        <iframe
          ref={iframeRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          src={`https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&controls=0&loop=1&playlist=${vid}&modestbranding=1&rel=0&playsinline=1&disablekb=1&enablejsapi=1`}
          allow="autoplay; encrypted-media"
          title={`${title} preview`}
          tabIndex={-1}
          onLoad={() => setTimeout(unmute, 350)}
        />
      )}

      {/* Legibility scrim — fades out while previewing so the clip is clean */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none transition-opacity duration-300 ${
          preview ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  )
}
