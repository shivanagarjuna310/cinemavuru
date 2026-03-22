'use client'
// src/components/FilmActions.tsx — with technical logging

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { logger }              from '@/lib/logger'

type Props = {
  filmId:       string
  initialLikes: number
  stateSlug:    string
  districtSlug: string
}

export default function FilmActions({ filmId, initialLikes, stateSlug, districtSlug }: Props) {
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    async function init() {
      const start = Date.now()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data, error } = await supabase
        .from('likes')
        .select('film_id')
        .eq('user_id', user.id)
        .eq('film_id', filmId)
        .maybeSingle()

      if (error) {
        await logger.error('FilmActions', 'init', 'Failed to check like status', error, { filmId })
      } else {
        await logger.debug('FilmActions', 'init', 'Like status checked', {
          filmId, isLiked: !!data, duration_ms: Date.now() - start
        })
      }

      if (data) setLiked(true)
    }
    init()
  }, [filmId])

  async function handleLike() {
    if (!userId) { window.location.href = '/auth'; return }
    if (loading) return

    setLoading(true)
    const start = Date.now()

    if (liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('film_id', filmId)

      if (error) {
        await logger.error('FilmActions', 'handleLike', 'Unlike failed', error, { filmId, userId })
      } else {
        await logger.info('FilmActions', 'handleLike', 'Film unliked', {
          filmId, userId, duration_ms: Date.now() - start
        })
        setLiked(false)
        setLikeCount(c => c - 1)
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, film_id: filmId })

      if (error) {
        await logger.error('FilmActions', 'handleLike', 'Like failed', error, { filmId, userId })
      } else {
        await logger.info('FilmActions', 'handleLike', 'Film liked', {
          filmId, userId, duration_ms: Date.now() - start
        })
        setLiked(true)
        setLikeCount(c => c + 1)
      }
    }

    setLoading(false)
  }

  function handleWhatsApp() {
    const url  = encodeURIComponent(window.location.href)
    const text = encodeURIComponent('Watch this short film on CinemaVuru 🎬')
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank')
    logger.info('FilmActions', 'handleWhatsApp', 'WhatsApp share clicked', { filmId })
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      logger.info('FilmActions', 'handleCopy', 'Link copied', { filmId })
    })
  }

  return (
    <div className="flex items-center gap-3 py-4 border-t border-b border-[#2E2010] mb-6 flex-wrap">
      <button
        onClick={handleLike}
        disabled={loading}
        title={userId ? '' : 'Login to like'}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60 ${
          liked
            ? 'bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FF6B1A]'
            : 'bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#FF6B1A] hover:border-[#FF6B1A]/30'
        }`}
      >
        {liked ? '♥' : '♡'}
        <span>{likeCount} {liked ? 'Liked!' : 'Like'}</span>
      </button>

      {!userId && (
        <span className="text-xs text-[#4A3020]">
          <a href="/auth" className="text-[#D4A017] hover:underline">Login</a> to like
        </span>
      )}

      <button onClick={handleWhatsApp}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#25D366] hover:border-[#25D366]/30 transition-all">
        📱 WhatsApp
      </button>

      <button onClick={handleCopy}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide bg-[#1A1208] border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] hover:border-[#D4A017]/30 transition-all">
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
    </div>
  )
}
