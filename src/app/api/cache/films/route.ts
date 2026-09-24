// POST /api/cache/films
//
// Busts the cached film reads after a client-side like/unlike.
//
// Likes are written straight from the browser into the `likes` table (a DB
// trigger keeps films.like_count in step), so there is no server hook where
// the cache could be invalidated. Without this, a like was correct in the
// database but the homepage kept serving the previous count for up to 60s —
// the user liked a film, went home, and nothing had changed.
//
// Cost is negligible: likes run at roughly 0.6/hour, against 15-19 Supabase
// queries saved on every uncached homepage render.
//
// `{ expire: 0 }` rather than a named profile: a named profile is
// stale-while-revalidate, which would still show the old number once — exactly
// the thing being fixed. Sign-in is required because liking requires it
// anyway, so this cannot be used anonymously to churn the cache.

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { TAG } from '@/lib/cacheTags'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })
  }

  revalidateTag(TAG.films, { expire: 0 })
  return NextResponse.json({ ok: true })
}
