// Dynamic share card for a film — makes WhatsApp/Instagram links unfurl as a
// poster (thumbnail + title + district + brand), with a "VOTE" badge when the
// film is a live contest entry (drives the contest share loop).

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'CinemaVuru — short film'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function ytThumb(url?: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: film } = await supabase
    .from('films')
    .select('title_en, video_url, districts(name_en)')
    .eq('id', id)
    .maybeSingle()

  // Is it a live (voting) contest entry? → add a VOTE badge
  let voteBadge: string | null = null
  const { data: contest } = await supabase
    .from('contests').select('id, season_number').eq('status', 'voting').limit(1).maybeSingle()
  if (contest) {
    const { data: entry } = await supabase
      .from('contest_entries').select('id')
      .eq('contest_id', contest.id).eq('film_id', id)
      .eq('is_approved', true).eq('payment_status', 'paid').maybeSingle()
    if (entry) voteBadge = `🗳  VOTE  ·  SEASON ${contest.season_number}`
  }

  const title = film?.title_en ?? 'CinemaVuru'
  const dRel: any = Array.isArray(film?.districts) ? film?.districts?.[0] : film?.districts
  const district = dRel?.name_en ?? ''
  const thumb = ytThumb(film?.video_url)

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', backgroundColor: '#0D0A06', fontFamily: 'sans-serif' }}>
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(90deg, rgba(8,6,15,0.96) 0%, rgba(8,6,15,0.78) 48%, rgba(8,6,15,0.35) 100%)' }} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, width: '100%' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'linear-gradient(135deg,#FF6B1A,#D4A017)' }}>🎬</div>
            <div style={{ display: 'flex', color: '#D4A017', fontSize: 32, fontWeight: 800 }}>CinemaVuru</div>
          </div>

          {/* Title + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {voteBadge && (
              <div style={{ display: 'flex', alignSelf: 'flex-start', background: 'linear-gradient(90deg,#FF6B1A,#D4A017)', color: '#000', fontSize: 26, fontWeight: 800, padding: '10px 22px', borderRadius: 999 }}>
                {voteBadge}
              </div>
            )}
            <div style={{ display: 'flex', color: '#ffffff', fontSize: 70, fontWeight: 900, lineHeight: 1.05, maxWidth: 960 }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 32 }}>
              {district && <div style={{ display: 'flex', color: '#E7DCC5' }}>📍 {district}</div>}
              <div style={{ display: 'flex', color: '#FFC845', fontWeight: 700 }}>▶ Watch free</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
