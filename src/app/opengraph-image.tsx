// Default brand share card (homepage + any page without its own OG image).

import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'CinemaVuru — District cinema of Telangana & Andhra Pradesh'
export const runtime = 'nodejs'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: 80, justifyContent: 'center', gap: 28, backgroundColor: '#0D0A06', backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,107,26,0.20), transparent 45%), radial-gradient(circle at 10% 90%, rgba(212,160,23,0.16), transparent 45%)', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: 'linear-gradient(135deg,#FF6B1A,#D4A017)' }}>🎬</div>
          <div style={{ display: 'flex', color: '#D4A017', fontSize: 40, fontWeight: 800 }}>CinemaVuru</div>
        </div>
        <div style={{ display: 'flex', color: '#ffffff', fontSize: 76, fontWeight: 900, lineHeight: 1.05, maxWidth: 1000 }}>
          The cinema of your district.
        </div>
        <div style={{ display: 'flex', color: '#E7DCC5', fontSize: 34, maxWidth: 950 }}>
          Hyperlocal short films by Telugu filmmakers — Telangana &amp; Andhra Pradesh. Watch free.
        </div>
      </div>
    ),
    { ...size },
  )
}
