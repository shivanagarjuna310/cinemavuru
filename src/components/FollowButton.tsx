'use client'
// Follow/unfollow a filmmaker. DB-backed (follows table). Shows a live follower
// count. Signed-out users are sent to /auth; you can't follow yourself.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export default function FollowButton({
  creatorId,
  size = 'md',
}: {
  creatorId: string
  size?: 'sm' | 'md'
}) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { count: c } = await supabase
        .from('follows').select('*', { count: 'exact', head: true }).eq('creator_id', creatorId)
      if (alive && typeof c === 'number') setCount(c)
      if (user) {
        const { data } = await supabase
          .from('follows').select('creator_id')
          .eq('follower_id', user.id).eq('creator_id', creatorId).maybeSingle()
        if (alive) setFollowing(!!data)
      } else if (alive) {
        setFollowing(false)
      }
    })()
    return () => { alive = false }
  }, [user, creatorId])

  const self = user?.id === creatorId

  async function toggle() {
    if (!user) { window.location.href = '/auth'; return }
    if (self || busy) return
    setBusy(true)
    if (following) {
      const { error } = await supabase.from('follows')
        .delete().eq('follower_id', user.id).eq('creator_id', creatorId)
      if (!error) { setFollowing(false); setCount((c) => Math.max(0, (c ?? 1) - 1)) }
    } else {
      const { error } = await supabase.from('follows')
        .insert({ follower_id: user.id, creator_id: creatorId })
      if (!error) { setFollowing(true); setCount((c) => (c ?? 0) + 1) }
    }
    setBusy(false)
  }

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <button onClick={toggle} disabled={busy || self}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition ${pad} ${
        self
          ? 'bg-[color:var(--surface)] text-[color:var(--muted)] ring-1 ring-[color:var(--border)] cursor-default'
          : following
          ? 'bg-[color:var(--surface)] text-[color:var(--text)] ring-1 ring-[color:var(--border)] hover:ring-[color:var(--accent-hot)]/40'
          : 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black hover:opacity-90'
      }`}>
      {self ? 'Your profile' : following ? '✓ Following' : '+ Follow'}
      {count !== null && count > 0 && (
        <span className={`${self || following ? 'text-[color:var(--muted)]' : 'text-black/70'} tabular-nums`}>· {count}</span>
      )}
    </button>
  )
}
