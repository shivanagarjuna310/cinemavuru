// src/app/not-found.tsx
// Custom 404 page - shown when any URL is not found

import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0A06',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '24px',
    }}>

      {/* Kolam dot pattern background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, #D4A01722 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* 404 number */}
        <div style={{
          fontSize: '120px',
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #FF6B1A, #D4A017)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          404
        </div>

        {/* Telugu line */}
        <p style={{
          fontSize: '22px',
          color: '#D4A017',
          marginBottom: '8px',
          fontWeight: 600,
        }}>
          ఈ పేజీ కనుగొనబడలేదు
        </p>

        {/* English subtitle */}
        <p style={{
          fontSize: '16px',
          color: '#7A6040',
          marginBottom: '40px',
          maxWidth: '360px',
        }}>
          This page could not be found. The film you're looking for may have been removed or the link is broken.
        </p>

        {/* Home button */}
        <Link href="/" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #FF6B1A, #D4A017)',
          color: 'white',
          padding: '14px 36px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '16px',
          marginBottom: '16px',
        }}>
          🎬 Back to CinemaVuru
        </Link>

        {/* Tagline */}
        <p style={{
          fontSize: '13px',
          color: '#4A3020',
          marginTop: '40px',
        }}>
          CinemaVuru — Hyperlocal Short Films from Telangana
        </p>

      </div>
    </div>
  )
}