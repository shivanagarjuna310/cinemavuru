import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['', '/about', '/contest', '/contest/films', '/contest/winners', '/upload', '/terms', '/privacy']
  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map(p => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.6,
  }))

  const [{ data: districts }, { data: films }] = await Promise.all([
    supabase.from('districts').select('slug, states(slug)').eq('is_active', true),
    supabase.from('films').select('id, created_at, districts(slug, states(slug))').eq('status', 'active'),
  ])

  const districtRoutes: MetadataRoute.Sitemap = (districts ?? []).map((d: any) => ({
    url: `${BASE}/${d.states?.slug ?? 'telangana'}/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  const filmRoutes: MetadataRoute.Sitemap = (films ?? []).map((f: any) => ({
    url: `${BASE}/${f.districts?.states?.slug ?? 'telangana'}/${f.districts?.slug ?? 'hyderabad'}/film/${f.id}`,
    lastModified: f.created_at ? new Date(f.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...districtRoutes, ...filmRoutes]
}
