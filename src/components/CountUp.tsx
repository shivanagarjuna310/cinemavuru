'use client'
// Counts up to `value` when scrolled into view. Falls back to the final
// number instantly when motion is reduced or IO is unavailable.

import { useEffect, useRef, useState } from 'react'

export default function CountUp({
  value,
  duration = 1400,
  suffix = '',
  className = '',
}: {
  value: number
  duration?: number
  suffix?: string
  className?: string
}) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  // Last number actually painted. Written only from inside the effect, so a
  // re-animation can pick up where the previous one stopped without making `n`
  // an effect dependency (which would restart the tween every frame).
  const shown = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      shown.current = value
      setN(value)
      return
    }

    let raf = 0
    // Scoped to this effect run, so a changed `value` always gets to animate.
    // A ref that outlived the run would latch after the first count and leave
    // the number stuck on a stale figure whenever the total changed.
    let ran = false

    const run = () => {
      if (ran) return
      ran = true
      const from = shown.current
      if (from === value) return
      const start = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        const next = Math.round(from + (value - from) * eased)
        shown.current = next
        setN(next)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            run()
            io.disconnect()
          }
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {n.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}
