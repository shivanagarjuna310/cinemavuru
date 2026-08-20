// Reels — a full-screen vertical feed of short-film clips. Public (no login),
// mobile-first, built to be the shareable top-of-funnel into the platform.

import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import ReelsFeed from '@/components/ReelsFeed'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Reels — CinemaVuru',
  description: 'Swipe through short-film clips by Telugu filmmakers from across Telangana & Andhra Pradesh.',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const COLS =
  'id, title_en, title_te, genre, video_url, view_count, like_count, creator_id, profiles!films_creator_id_fkey(id, name), districts(name_en, slug, states(slug))'

export default async function ReelsPage() {
  const { data } = await supabase
    .from('films')
    .select(COLS)
    .eq('status', 'active')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)

  return <ReelsFeed films={data ?? []} />
}
