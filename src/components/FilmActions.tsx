'use client'
// src/components/FilmActions.tsx
// Like button — now saves to Supabase likes table permanently.
// View count increments on every page load via the film page.

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'

type Props = {
  filmId:       string
  initialLikes: number
  stateSlug:    string
  districtSlug: string
}

export default function FilmActions({
  filmId, initialLikes, stateSlug, districtSlug,
}: Props) {
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)

  // On mount: get current user + check if they already liked this film
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Check if this user already liked this film
      const { data } = await supabase
        .from('likes')
        .select('film_id')
        .eq('user_id', user.id)
        .eq('film_id', filmId)
        .maybeSingle()

      if (data) setLiked(true)
    }
    init()
  }, [filmId])

  async function handleLike() {
    // Must be logged in
    if (!userId) {
      window.location.href = '/auth'
      return
    }

    if (loading) return
    setLoading(true)

    if (liked) {
      // Unlike — delete from likes table
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('film_id', filmId)

      setLiked(false)
      setLikeCount(c => c - 1)
    } else {
      // Like — insert into likes table
      await supabase
        .from('likes')
        .insert({ user_id: userId, film_id: filmId })

      setLiked(true)
      setLikeCount(c => c + 1)
    }

    setLoading(false)
  }

  function handleWhatsApp() {
    const url  = encodeURIComponent(window.location.href)
    const text = encodeURIComponent('Watch this short film on CinemaVuru 🎬')
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#2E2010] mb-6 flex-wrap">

      {/* Like button */}
      <button
        onClick={handleLike}
        disabled={loading}
        title={userId ? '' : 'Login to like this film'}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60 ${
          liked
            ? 'bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FF6B1A]'
            : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#FF6B1A] hover:border-[#FF6B1A]/30'
        }`}
      >
        {liked ? '♥' : '♡'}
        <span>{likeCount} {liked ? 'Liked!' : 'Like'}</span>
      </button>

      {/* Not logged in hint */}
      {!userId && (
        <span className="text-xs text-[#4A3020]">
          <a href="/auth" className="text-[#D4A017] hover:underline">Login</a> to like
        </span>
      )}

      {/* WhatsApp share */}
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#25D366] hover:border-[#25D366]/30 transition-all"
      >
        📱 WhatsApp
      </button>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] hover:border-[#D4A017]/30 transition-all"
      >
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>

    </div>
  )
}
