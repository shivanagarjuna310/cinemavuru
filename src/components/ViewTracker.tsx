'use client'
// Fires a one-time, fire-and-forget view beacon on mount. Keeps view-counting
// off the server render path so the film page stays cacheable. Bots don't run
// JS, so this naturally excludes crawlers too.

import { useEffect, useRef } from 'react'

export default function ViewTracker({ filmId }: { filmId: string }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    fetch('/api/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filmId }),
      keepalive: true,
    }).catch(() => {})
  }, [filmId])
  return null
}
