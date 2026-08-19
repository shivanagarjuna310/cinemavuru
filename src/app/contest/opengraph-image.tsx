// Dynamic share card for the contest hub — "Season N · Voting live / Submissions
// open" with the prize pool, so shared contest links pull people into the vote.

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'CinemaVuru Contest'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default async function Image() {
  const { data: c } = await supabase
    .from('contests')
    .select('title, status, season_number, prize_1st, prize_2nd, prize_3rd')
    .in('status', ['open', 'voting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const pool = c ? (c.prize_1st ?? 0) + (c.prize_2nd ?? 0) + (c.prize_3rd ?? 0) : 0
  const phase = c?.status === 'voting' ? '🗳  VOTING LIVE' : c?.status === 'open' ? '🎬  SUBMISSIONS OPEN' : 'MONTHLY CONTEST'
  const headline = c ? `Season ${c.season_number}` : 'The Monthly Contest'

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: 72, justifyContent: 'space-between', backgroundColor: '#0D0A06', backgroundImage: 'radial-gradient(circle at 78% 18%, rgba(212,160,23,0.20), transparent 45%)', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'linear-gradient(135deg,#FF6B1A,#D4A017)' }}>🎬</div>
          <div style={{ display: 'flex', color: '#D4A017', fontSize: 32, fontWeight: 800 }}>CinemaVuru</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', background: 'linear-gradient(90deg,#FF6B1A,#D4A017)', color: '#000', fontSize: 26, fontWeight: 800, padding: '10px 22px', borderRadius: 999 }}>
            {phase}
          </div>
          <div style={{ display: 'flex', color: '#ffffff', fontSize: 84, fontWeight: 900, lineHeight: 1 }}>{headline}</div>
          <div style={{ display: 'flex', color: '#E7DCC5', fontSize: 40, maxWidth: 1000 }}>{c?.title ?? 'Short film contest for Telangana & Andhra'}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 34 }}>
          {pool > 0 && (
            <div style={{ display: 'flex', color: '#FFC845', fontWeight: 800 }}>🏆 ₹{pool.toLocaleString('en-IN')} prize pool</div>
          )}
          <div style={{ display: 'flex', color: '#FFC845', fontWeight: 700 }}>· Vote free</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
