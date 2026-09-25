// GET /api/poster/<filmId>?format=square|story
//
// A ready-to-post milestone poster for a film — the thing a filmmaker actually
// shares, instead of a bare link. Generated on demand rather than stored: it is
// always current, costs one query, and there is nothing to clean up.
//
// Thresholds come from lib/milestones so the poster and the milestone email
// can never celebrate different numbers. Below the first milestone the poster
// still renders, as a "now streaming" card — a filmmaker on 9 views needs
// something to share more than one on 500 does.
//
// Sizes are the two that matter on the platforms these get posted to:
// 1080x1080 for an Instagram/WhatsApp post, 1080x1920 for a story.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { VIEW_MILESTONES, LIKE_MILESTONES, highestReached, fmt } from '@/lib/milestones'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Satori ships no Telugu glyphs, and 32 of the 164 active films carry Telugu
// script in a title — without this they render as tofu boxes on a poster
// somebody is about to post publicly. Read once per process, not per request.
let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]> | null = null
function loadFonts() {
  fontCache ??= (async () => {
    const dir = path.join(process.cwd(), 'public', 'fonts')
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, 'NotoSansTelugu-Regular.ttf')),
      readFile(path.join(dir, 'NotoSansTelugu-Bold.ttf')),
    ])
    return [
      { name: 'Noto Sans Telugu', data: regular, weight: 400 as const, style: 'normal' as const },
      { name: 'Noto Sans Telugu', data: bold, weight: 700 as const, style: 'normal' as const },
    ]
  })()
  return fontCache
}

function videoId(url?: string | null) {
  return url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1] ?? null
}

// hqdefault.jpg is a 4:3 canvas with black bars baked in around a 16:9 frame,
// which is why an early version of this poster had a black band top and bottom.
// maxresdefault/sddefault are true 16:9. YouTube 404s the ones it does not
// have, so walk down until one answers.
async function bestThumb(url?: string | null): Promise<string | null> {
  const id = videoId(url)
  if (!id) return null
  for (const name of ['maxresdefault', 'sddefault', 'hq720', 'mqdefault']) {
    const candidate = `https://img.youtube.com/vi/${id}/${name}.jpg`
    try {
      const res = await fetch(candidate, { method: 'HEAD', next: { revalidate: 86400 } })
      if (res.ok) return candidate
    } catch {
      /* try the next size */
    }
  }
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const story = new URL(req.url).searchParams.get('format') === 'story'
  const W = 1080
  const H = story ? 1920 : 1080

  const { data: film } = await supabase
    .from('films')
    .select('title_en, title_te, video_url, view_count, like_count, profiles!films_creator_id_fkey(name), districts(name_en)')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!film) return new Response('Not found', { status: 404 })

  const [fonts, thumb] = await Promise.all([loadFonts(), bestThumb(film.video_url)])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rel = (v: any) => (Array.isArray(v) ? v[0] : v)
  const creator = rel(film.profiles)?.name ?? 'Independent Filmmaker'
  const district = rel(film.districts)?.name_en ?? ''
  const views = film.view_count ?? 0
  const likes = film.like_count ?? 0

  // Celebrate the more impressive of the two, falling back to a launch card.
  const vHigh = highestReached(views, VIEW_MILESTONES)
  const lHigh = highestReached(likes, LIKE_MILESTONES)
  const headline = vHigh
    ? { big: fmt(vHigh), small: 'VIEWS ON CINEMAVURU' }
    : lHigh
      ? { big: fmt(lHigh), small: 'PEOPLE LOVED THIS FILM' }
      : { big: null, small: 'NOW STREAMING ON CINEMAVURU' }

  const PAD = story ? 90 : 72

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#0D0A06',
          fontFamily: '"Noto Sans Telugu", sans-serif',
        }}
      >
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            width={W}
            height={H}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            // Heavier than a normal share card on purpose: the title sits over
            // whatever frame YouTube picked, which is often already busy with
            // burned-in titles and laurels.
            background:
              'linear-gradient(180deg, rgba(8,6,15,0.88) 0%, rgba(8,6,15,0.62) 30%, rgba(8,6,15,0.94) 66%, rgba(8,6,15,0.99) 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: PAD,
            width: '100%',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FF6B1A, #D4A017)',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}
            >
              🎬
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                fontWeight: 700,
                color: '#F5E7C8',
                letterSpacing: 1,
              }}
            >
              CinemaVuru
            </div>
          </div>

          {/* Milestone */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {headline.big && (
              <div
                style={{
                  display: 'flex',
                  fontSize: story ? 210 : 178,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#D4A017',
                  letterSpacing: -4,
                }}
              >
                {headline.big}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                fontSize: story ? 40 : 34,
                fontWeight: 800,
                color: '#FF6B1A',
                letterSpacing: 4,
                marginTop: headline.big ? 10 : 0,
              }}
            >
              {headline.small}
            </div>

            <div
              style={{
                display: 'flex',
                width: 120,
                height: 6,
                borderRadius: 3,
                background: 'linear-gradient(90deg, #FF6B1A, #D4A017)',
                margin: '38px 0',
              }}
            />

            <div
              style={{
                display: 'flex',
                fontSize: story ? 76 : 64,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.1,
              }}
            >
              {film.title_en}
            </div>
            {film.title_te && (
              <div style={{ display: 'flex', fontSize: 38, color: '#C9BCA4', marginTop: 12 }}>
                {film.title_te}
              </div>
            )}
            <div style={{ display: 'flex', fontSize: 34, color: '#F5E7C8', marginTop: 22 }}>
              {creator}
              {district ? `  ·  ${district}` : ''}
            </div>
          </div>

          {/* Footer stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 34, fontSize: 30, color: '#C9BCA4' }}>
              <div style={{ display: 'flex' }}>{`👁  ${fmt(views)}`}</div>
              <div style={{ display: 'flex' }}>{`❤️  ${fmt(likes)}`}</div>
            </div>
            <div style={{ display: 'flex', fontSize: 28, color: '#8A7B63' }}>cinemavuru.com</div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: {
        // Short enough that a fresh milestone shows up quickly, long enough
        // that re-sharing the same poster does not re-render it every time.
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    },
  )
}
