'use client'
// Horizontal scroll container with prev/next arrow buttons (desktop). Arrows
// appear only when there's more to scroll in that direction. On touch devices
// users just swipe, so the arrows are hidden on small screens.

import { useEffect, useRef, useState } from 'react'

export default function ScrollRow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  function update() {
    const el = ref.current
    if (!el) return
    const overflowing = el.scrollWidth > el.clientWidth + 4
    setCanLeft(overflowing && el.scrollLeft > 4)
    setCanRight(overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Recheck after images/thumbnails settle the width
    const t = setTimeout(update, 600)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      clearTimeout(t)
    }
  }, [])

  function scroll(dir: 1 | -1) {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  // Premium arrow: fills with the brand gradient + lifts on hover. The edge
  // fade lets the cards "slide under" the control (Netflix-style).
  const btn =
    'group/btn flex w-12 h-12 rounded-full items-center justify-center ' +
    'bg-[color:var(--surface)]/90 backdrop-blur-md ring-1 ring-[color:var(--border)] ' +
    'text-[color:var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ' +
    'hover:bg-gradient-to-br hover:from-[#FF6B1A] hover:to-[#D4A017] hover:text-black ' +
    'hover:ring-transparent hover:scale-110 active:scale-95 ' +
    'transition-all duration-200 ease-out cursor-pointer'

  const chevron = 'transition-transform duration-200'

  return (
    <div className="relative">
      {canLeft && (
        <>
          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-r from-[color:var(--bg)] via-[color:var(--bg)]/60 to-transparent pointer-events-none" />
          <button onClick={() => scroll(-1)} aria-label="Scroll left"
            className={`hidden sm:flex absolute left-2 top-[44%] -translate-y-1/2 z-40 ${btn}`}>
            <svg className={`${chevron} group-hover/btn:-translate-x-0.5`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </>
      )}

      <div ref={ref} className={className} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {children}
      </div>

      {canRight && (
        <>
          <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-l from-[color:var(--bg)] via-[color:var(--bg)]/60 to-transparent pointer-events-none" />
          <button onClick={() => scroll(1)} aria-label="Scroll right"
            className={`hidden sm:flex absolute right-2 top-[44%] -translate-y-1/2 z-40 ${btn}`}>
            <svg className={`${chevron} group-hover/btn:translate-x-0.5`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}
    </div>
  )
}
