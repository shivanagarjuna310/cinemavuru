'use client'
// Global site footer. Hidden on immersive full-screen routes (e.g. /reels)
// where site chrome would break the experience.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HIDDEN_PREFIXES = ['/reels']

export default function SiteFooter() {
  const pathname = usePathname()
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <footer className="relative z-10 border-t border-[color:var(--border)] mt-16 bg-[color:var(--bg)]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-xs">🎬</div>
            <span className="text-[color:var(--accent)] font-bold text-sm">CinemaVuru</span>
            <span className="text-[color:var(--muted)] text-xs">· సినిమా వూరు</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-[color:var(--text)] font-medium">
            <Link href="/telangana/hyderabad" className="hover:text-[color:var(--accent)] transition">Films</Link>
            <Link href="/contest" className="hover:text-[color:var(--accent)] transition">Contest</Link>
            <Link href="/contest/winners" className="hover:text-[color:var(--accent)] transition">Hall of Fame</Link>
            <Link href="/terms" className="hover:text-[color:var(--accent)] transition">Terms</Link>
            <Link href="/privacy" className="hover:text-[color:var(--accent)] transition">Privacy</Link>
          </div>

          {/* Copyright */}
          <p className="text-[color:var(--muted)] text-xs">
            © {new Date().getFullYear()} CinemaVuru. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  )
}
