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
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setN(value)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            const start = performance.now()
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration)
              const eased = 1 - Math.pow(1 - p, 3)
              setN(Math.round(value * eased))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            io.disconnect()
          }
        })
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className={className}>
      {n.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}
