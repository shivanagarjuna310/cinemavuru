'use client'
// src/components/CommentSection.tsx
// Comments now save to Supabase and load in real time.

import { useState, useEffect, useRef } from 'react'
import { supabase }                     from '@/lib/supabase'

type Comment = {
  id:         string
  text:       string
  created_at: string
  profiles:   { name: string | null } | null
}

type Props = {
  filmId:          string
  initialComments: Comment[]
}

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function getInitial(name: string | null | undefined) {
  return (name ?? 'A')[0].toUpperCase()
}

export default function CommentSection({ filmId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text,     setText]     = useState('')
  const [posting,  setPosting]  = useState(false)
  const [userId,   setUserId]   = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('You')
  const [error,    setError]    = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      setUserName(
        data.user.user_metadata?.name ?? data.user.email ?? 'You'
      )
    })
  }, [])

  // Real-time: subscribe to new comments on this film
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${filmId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'comments',
          filter: `film_id=eq.${filmId}`,
        },
        async (payload) => {
          // Fetch the profile for the new comment
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.user_id)
            .single()

          const newComment: Comment = {
            id:         payload.new.id,
            text:       payload.new.text,
            created_at: payload.new.created_at,
            profiles:   profile ?? { name: 'Anonymous' },
          }

          setComments(prev => [newComment, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [filmId])

  async function handlePost() {
    const trimmed = text.trim()
    if (!trimmed || posting) return

    if (!userId) {
      window.location.href = '/auth'
      return
    }

    setPosting(true)
    setError('')

    const { error: err } = await supabase.from('comments').insert({
      film_id: filmId,
      user_id: userId,
      text:    trimmed,
    })

    if (err) {
      setError('Could not post comment. Please try again.')
      setPosting(false)
      return
    }

    // Clear input — real-time subscription adds comment to list
    setText('')
    setPosting(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="mt-8">

      <h3 className="text-lg font-bold text-[#D4A017] mb-5">
        💬 Comments ({comments.length})
      </h3>

      {/* Input */}
      <div className="flex gap-3 mb-8">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
          {getInitial(userName)}
        </div>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handlePost()
              }
            }}
            placeholder={
              userId
                ? 'Write a comment in Telugu or English...'
                : 'Login to comment...'
            }
            disabled={!userId}
            rows={2}
            maxLength={1000}
            className="w-full bg-[#1A1208] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] resize-none focus:outline-none focus:border-[#D4A017]/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {error && (
            <p className="text-red-400 text-xs mt-1">{error}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            {userId ? (
              <p className="text-xs text-[#4A3020]">
                Enter to post · Shift+Enter for new line
              </p>
            ) : (
              <p className="text-xs text-[#4A3020]">
                <a href="/auth" className="text-[#D4A017] hover:underline">
                  Login
                </a>{' '}
                to join the conversation
              </p>
            )}
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting || !userId}
              className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-40 hover:opacity-90 transition"
            >
              {posting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-10 text-[#4A3020]">
          <p className="text-2xl mb-2">💬</p>
          <p className="text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2E2010] flex items-center justify-center text-[#D4A017] font-bold text-sm flex-shrink-0">
                {getInitial(c.profiles?.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-[#D4A017]">
                    {c.profiles?.name ?? 'Anonymous'}
                  </span>
                  <span className="text-xs text-[#4A3020]">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-sm text-[#FDF6E3]/80 leading-relaxed">
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
