'use client'
// Auth-aware CTA for the coming-soon teaser.
//
// WHY THIS IS A CLIENT COMPONENT: the teaser itself is server-rendered, so it
// has no idea who is looking at it. It was showing "Create your free account"
// to signed-in users, which reads as broken — they already have one.
//
// Signed in  → a short confirmation. Nothing to ask for; they're already on the
//              platform, which was the entire point of the CTA.
// Signed out → the registration ask.
//
// While auth is still resolving we render an invisible placeholder of the same
// height rather than guessing. Defaulting to the signed-out CTA would flash
// "Create your free account" at signed-in users for a moment — which is the bug
// this component exists to fix. The session is read from local storage, so the
// wait is a few milliseconds, and reserving the height avoids any layout shift.

import Link from 'next/link'
import { useAuth } from './AuthProvider'

export default function ContestTeaserCta() {
  const { user, loading } = useAuth()

  if (loading) return <div className="mt-7 h-[50px]" aria-hidden />

  if (user) {
    return (
      <div className="mt-7 text-center">
        <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--accent)]/35 bg-[color:var(--bg)] px-4 py-3">
          <span className="text-[color:var(--accent)]" aria-hidden>✓</span>
          <span className="text-sm font-semibold text-[color:var(--text)]">
            You&apos;re all set — we&apos;ll announce the details soon.
          </span>
        </div>
        <p className="text-[color:var(--faint)] text-[11px] mt-3">
          Nothing to do for now. Keep publishing — it&apos;s always free.
        </p>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/auth"
        className="mt-7 block text-center bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-3.5 rounded-xl font-black uppercase tracking-wide text-[13px] sm:text-sm hover:opacity-90 transition"
      >
        Create your free account
      </Link>
      <p className="text-[color:var(--faint)] text-[11px] text-center mt-3.5 leading-relaxed">
        Free to join. Full details announced soon.
      </p>
    </>
  )
}
