// Aggregations behind /leaderboard.
//
// Deliberately computed in JS from three small reads rather than in SQL: the
// whole dataset is 164 active films, 134 creators and 23 districts, so the
// grouping costs nothing, and it avoids adding RPCs that would then need their
// own grants. Wrapped in unstable_cache at 5 minutes, so the page costs three
// queries per five minutes however many people are looking at it.

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { TAG } from '@/lib/cacheTags'
import { tierFor, type Tier } from '@/lib/tiers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export type DistrictRow = {
  id: string
  name: string
  slug: string
  stateSlug: string
  films: number
  creators: number
  views: number
  likes: number
}

export type CreatorRow = {
  id: string
  name: string
  districtName: string | null
  districtSlug: string
  stateSlug: string
  films: number
  views: number
  likes: number
  supporters: number
  tier: Tier
}

type FilmRow = {
  creator_id: string | null
  district_id: string | null
  view_count: number | null
  like_count: number | null
}

async function load() {
  // Supporters are counted from `follows`, not read from profiles.follower_count.
  // That column exists but nothing ever wrote to it — 53 rows in follows and
  // every profile reading 0. FOLLOWER_COUNT_SETUP.sql adds the trigger that
  // repairs it, but the board must not silently show zeroes if that has not
  // been run yet, and the whole table is small enough to count outright.
  const [films, profiles, districts, follows] = await Promise.all([
    supabase
      .from('films')
      .select('creator_id, district_id, view_count, like_count')
      .eq('status', 'active'),
    supabase.from('profiles').select('id, name, district_id'),
    supabase.from('districts').select('id, name_en, slug, states(slug)'),
    supabase.from('follows').select('creator_id'),
  ])

  const f = (films.data ?? []) as FilmRow[]

  const supporterCount = new Map<string, number>()
  for (const row of (follows.data ?? []) as { creator_id: string | null }[]) {
    if (!row.creator_id) continue
    supporterCount.set(row.creator_id, (supporterCount.get(row.creator_id) ?? 0) + 1)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dMeta = new Map<string, { name: string; slug: string; stateSlug: string }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((districts.data ?? []) as any[]).map((d) => [
      d.id as string,
      {
        name: d.name_en as string,
        slug: d.slug as string,
        stateSlug: (Array.isArray(d.states) ? d.states[0]?.slug : d.states?.slug) ?? 'telangana',
      },
    ]),
  )

  // ── by district ───────────────────────────────────────────────────────────
  const dAgg = new Map<string, { films: number; views: number; likes: number; creators: Set<string> }>()
  for (const row of f) {
    if (!row.district_id) continue
    const a = dAgg.get(row.district_id) ?? { films: 0, views: 0, likes: 0, creators: new Set<string>() }
    a.films += 1
    a.views += row.view_count ?? 0
    a.likes += row.like_count ?? 0
    if (row.creator_id) a.creators.add(row.creator_id)
    dAgg.set(row.district_id, a)
  }

  const byDistrict: DistrictRow[] = [...dAgg.entries()]
    .map(([id, a]) => {
      const m = dMeta.get(id)
      return {
        id,
        name: m?.name ?? 'Unknown district',
        slug: m?.slug ?? '',
        stateSlug: m?.stateSlug ?? 'telangana',
        films: a.films,
        creators: a.creators.size,
        views: a.views,
        likes: a.likes,
      }
    })
    .filter((d) => d.slug)
    .sort((a, b) => b.views - a.views || b.films - a.films)

  // ── by filmmaker ──────────────────────────────────────────────────────────
  const pMeta = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((profiles.data ?? []) as any[]).map((p) => [p.id as string, p]),
  )

  const cAgg = new Map<string, { films: number; views: number; likes: number }>()
  for (const row of f) {
    if (!row.creator_id) continue
    const a = cAgg.get(row.creator_id) ?? { films: 0, views: 0, likes: 0 }
    a.films += 1
    a.views += row.view_count ?? 0
    a.likes += row.like_count ?? 0
    cAgg.set(row.creator_id, a)
  }

  const byCreator: CreatorRow[] = [...cAgg.entries()]
    .map(([id, a]) => {
      const p = pMeta.get(id)
      const d = p?.district_id ? dMeta.get(p.district_id) : undefined
      const supporters = supporterCount.get(id) ?? 0
      return {
        id,
        name: (p?.name as string | null) || 'Independent Filmmaker',
        districtName: d?.name ?? null,
        districtSlug: d?.slug ?? 'hyderabad',
        stateSlug: d?.stateSlug ?? 'telangana',
        films: a.films,
        views: a.views,
        likes: a.likes,
        supporters,
        tier: tierFor({ views: a.views, supporters }),
      }
    })
    .sort((a, b) => b.views - a.views || b.supporters - a.supporters)

  return { byDistrict, byCreator }
}

export const getLeaderboard = unstable_cache(load, ['leaderboard-v1'], {
  revalidate: 300,
  tags: [TAG.films, TAG.leaderboard],
})
