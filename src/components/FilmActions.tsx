'use client'
// src/components/FilmActions.tsx
// Like button + Share button — needs to be client component
// because it has interactivity (useState, onClick)

import { useState } from 'react'

type Props = {
  filmId:       string
  initialLikes: number
  stateSlug:    string
  districtSlug: string
}

export default function FilmActions({ filmId, initialLikes, stateSlug, districtSlug }: Props) {
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [copied,    setCopied]    = useState(false)

  function handleLike() {
    // Toggle like locally for now
    // After auth is built, this will save to Supabase likes table
    setLiked(v => !v)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  function handleShare() {
    const url = `${window.location.origin}/${stateSlug}/${districtSlug}/film/${filmId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleWhatsApp() {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent('Watch this short film on CinemaVuru 🎬')
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
  }

  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#2E2010] mb-6 flex-wrap">

      {/* Like button */}
      <button
        onClick={handleLike}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${
          liked
            ? 'bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FF6B1A]'
            : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#FF6B1A] hover:border-[#FF6B1A]/30'
        }`}
      >
        {liked ? '♥' : '♡'}
        <span>{likeCount} {liked ? 'Liked!' : 'Like'}</span>
      </button>

      {/* WhatsApp share */}
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#25D366] hover:border-[#25D366]/30 transition-all"
      >
        📱 Share on WhatsApp
      </button>

      {/* Copy link */}
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] hover:border-[#D4A017]/30 transition-all"
      >
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>

    </div>
  )
}
