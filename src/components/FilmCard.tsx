'use client'
// src/components/FilmCard.tsx

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'


type Props = {
  id:           string
  title:        string
  titleTe?:     string
  genre:        string
  likes:        number
  views:        string
  emoji:        string
  gradient:     string
  duration?:    string
  isTop?:       boolean
  isTrending?:  boolean
  stateSlug?:   string
  districtSlug?: string
  videoUrl?:    string  // ← new
}

// Extract YouTube video ID from any YouTube URL format
function getYouTubeThumbnail(url: string | undefined): string | null {
  if (!url) return null
  try {
    // Handle embed URLs: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
    if (embedMatch) return `https://img.youtube.com/vi/${embedMatch[1]}/hqdefault.jpg`

    // Handle watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
    if (watchMatch) return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`

    // Handle short URLs: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
    if (shortMatch) return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`

    return null
  } catch {
    return null
  }
}

export default function FilmCard({
  id, title, titleTe, genre, likes, views,
  emoji, gradient, duration = '—',
  isTop = false, isTrending = false,
  stateSlug = 'telangana', districtSlug = 'hyderabad',
  videoUrl,
}: Props) {
  const router = useRouter()
  const [liked,      setLiked]      = useState(false)
  const [likeCount,  setLikeCount]  = useState(likes)
  const [imgError,   setImgError]   = useState(false)

  const thumbnail = getYouTubeThumbnail(videoUrl)
  if (typeof window !== 'undefined') console.log('FilmCard:', title, 'videoUrl:', videoUrl, 'thumbnail:', thumbnail)
  const showThumbnail = thumbnail

  function goToFilm() {
    router.push(`/${stateSlug}/${districtSlug}/film/${id}`)
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    setLiked(v => !v)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  return (
    <div
      onClick={goToFilm}
      className="bg-[#1A1208] rounded-xl overflow-hidden border border-[#2E2010] hover:-translate-y-1 hover:border-[#D4A017]/40 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className={`relative h-44 ${showThumbnail ? '' : gradient} flex items-center justify-center text-5xl overflow-hidden`}>

       {showThumbnail ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          emoji
        )}

        {isTop && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded z-10">
            🏆 Top Film
          </div>
        )}
        {isTrending && (
          <div className="absolute top-2 right-2 bg-[#8B1A1A]/90 text-red-300 text-[10px] font-semibold px-2 py-0.5 rounded z-10">
            🔥 Trending
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm z-10">
          {duration}
        </div>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="w-14 h-14 bg-[#FF6B1A] rounded-full flex items-center justify-center text-xl shadow-lg">
            ▶
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-base text-[#FDF6E3] leading-snug mb-0.5 line-clamp-1">
          {title}
        </h3>
        {titleTe && (
          <p className="text-[11px] text-[#7A6040] mb-2">{titleTe}</p>
        )}
        <p className="text-sm text-[#7A6040] mb-3">{genre}</p>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${
              liked ? 'text-[#FF6B1A]' : 'text-[#7A6040] hover:text-[#FF6B1A]'
            }`}
          >
            {liked ? '♥' : '♡'} {likeCount}
          </button>
          <span className="text-[#7A6040]">👁 {views}</span>
        </div>
      </div>
    </div>
  )
}
