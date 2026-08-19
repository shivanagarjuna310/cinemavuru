'use client'
// Floating "Share Your Film" action button. Shown only on discovery / content
// pages where inspiring a viewer to upload makes sense (home, district browse,
// film watch, creator, about). Hidden on utility / transactional pages below.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Hidden on: the upload flow itself, auth, admin, the user's profile, the
// contest (paid) flow, and legal pages — where the FAB is redundant or noise.
const HIDDEN_PREFIXES = ['/upload', '/auth', '/cv-admin-1a25', '/profile', '/contest', '/terms', '/privacy', '/reels']

export default function FloatingUploadButton() {
  const pathname = usePathname()
  if (HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <Link
      href="/upload"
      aria-label="Share your film"
      title="Share your film"
      className="anim-pop group fixed z-40 bottom-5 right-5 sm:bottom-7 sm:right-7
        flex items-center justify-center gap-2
        w-14 h-14 sm:w-auto sm:h-auto sm:pl-4 sm:pr-5 sm:py-4
        rounded-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black
        font-bold uppercase tracking-wide text-sm
        shadow-xl shadow-orange-900/30 ring-1 ring-black/10
        hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-orange-900/40
        transition-all duration-300
        pb-[max(0px,env(safe-area-inset-bottom))] sm:pb-4"
    >
      {/* Film + plus icon */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:rotate-90">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Share Your Film</span>
    </Link>
  )
}
