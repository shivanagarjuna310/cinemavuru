// POST /api/view  { filmId }
// Records a unique view (per IP per day) off the render path, so the film page
// itself can be statically/ISR cached. Bots don't run JS so they never call
// this; we still guard by user-agent + IP server-side as a backstop.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BOT_UA = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|facebot|whatsapp|telegram|discord|slack|linkedin|twitter|pinterest|embedly|quora|preview|scrapy|python-requests|http-client|okhttp|axios|node-fetch|curl|wget|headless|phantom|lighthouse|pagespeed|gptbot|claudebot|bytespider|petalbot|dataforseo|semrush|ahrefs|mj12|dotbot|yandex|bingpreview|applebot|amazonbot/i

export async function POST(req: Request) {
  try {
    const { filmId } = await req.json()
    if (!filmId || typeof filmId !== 'string') {
      return new NextResponse(null, { status: 400 })
    }

    const ua = req.headers.get('user-agent') ?? ''
    if (!ua || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 })

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    if (ip === 'unknown') return new NextResponse(null, { status: 204 })

    const today = new Date().toISOString().split('T')[0]
    await supabase.rpc('increment_view', {
      p_film_id: filmId,
      p_viewer_key: `${ip}-${today}`,
    })
    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
