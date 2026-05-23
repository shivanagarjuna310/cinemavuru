// src/components/PWARegister.tsx
// Registers the service worker silently in the background
// Also shows "Add to Home Screen" prompt on Android

'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.log('SW registration failed:', err))
    }
  }, [])

  return null // This component renders nothing — runs silently
}