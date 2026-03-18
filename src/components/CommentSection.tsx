'use client'
// src/components/CommentSection.tsx

import { useState } from 'react'

type Comment = {
  id:         string
  text:       string
  created_at: string
  profiles:   { name: string | null; avatar_url: string | null } | null
}

type Props = {
  filmId:          string
  initialComments: Comment[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function CommentSection({ filmId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text,     setText]     = useState('')
  const [posting,  setPosting]  = useState(false)

  async function handlePost() {
    const trimmed = text.trim()
    if (!trimmed || posting) return

    setPosting(true)

    // For now: add comment locally so user sees immediate feedback
    // After auth is built, this will save to Supabase comments table
    const newComment: Comment = {
      id:         Date.now().toString(),
      text:       trimmed,
      created_at: new Date().toISOString(),
      profiles:   { name: 'You', avatar_url: null },
    }
    setComments(prev => [newComment, ...prev])
    setText('')
    setPosting(false)

    // TODO after auth: save to supabase
    // const { error } = await supabase.from('comments').insert({
    //   film_id: filmId, user_id: session.user.id, text: trimmed
    // })
  }

  function getInitial(name: string | null | undefined) {
    return (name ?? 'A')[0].toUpperCase()
  }

  return (
    <div className="mt-8">

      <h3 className="text-lg font-bold text-[#D4A017] mb-5">
        💬 Comments ({comments.length})
      </h3>

      {/* Input box */}
      <div className="flex gap-3 mb-8">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
          Y
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handlePost()
              }
            }}
            placeholder="Write a comment in Telugu or English..."
            rows={2}
            className="w-full bg-[#1A1208] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] resize-none focus:outline-none focus:border-[#D4A017]/40 transition"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[#4A3020]">
              Press Enter to post · Login required to save
            </p>
            <button
              onClick={handlePost}
              disabled={!text.trim() || posting}
              className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-40 hover:opacity-90 transition"
            >
              {posting ? 'Posting...' : 'Post'}
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
                  <span className="text-xs text-[#4A3020]">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-[#FDF6E3]/80 leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
