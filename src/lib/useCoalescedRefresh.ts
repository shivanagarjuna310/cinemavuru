'use client'
// Collapses repeated triggers of the same refresh into at most one in-flight
// request, plus one follow-up run if anything asked again while it was busy.
//
// The rails refresh from window events (watchlist changed, watch progress
// saved, preferences changed) and those events can arrive faster than the query
// returns — watch progress alone dispatches every 10 seconds during playback.
// Firing a new request per event piles up concurrent queries against the same
// rows and, on a slow connection, they can return out of order.
//
// Coalescing rather than dropping matters: the LAST trigger is the one whose
// data must win, so a trigger arriving mid-flight schedules exactly one more
// run instead of being discarded.

import { useCallback, useEffect, useRef } from 'react'

export function useCoalescedRefresh(fn: () => Promise<void>): () => Promise<void> {
  const fnRef = useRef(fn)
  // Synced in an effect, not during render — writing a ref while rendering is
  // what react-hooks/refs forbids.
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const running = useRef(false)
  const queued = useRef(false)

  return useCallback(async () => {
    if (running.current) {
      queued.current = true
      return
    }
    running.current = true
    try {
      do {
        queued.current = false
        await fnRef.current()
      } while (queued.current)
    } finally {
      running.current = false
    }
  }, [])
}
