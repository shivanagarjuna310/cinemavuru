// src/app/auth/page.tsx
// Login and Register — both on one page, toggled by tabs.
// Uses Supabase Auth — they handle passwords, tokens, security.

import AuthForm from '@/components/AuthForm'
import Link     from 'next/link'

export default function AuthPage() {
  return (
    <main className="relative z-10 min-h-screen text-[#FDF6E3] flex items-center justify-center px-4 py-16">

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,107,26,0.08),transparent)]" />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-xl">
              🎬
            </div>
            <div className="text-left">
              <div className="text-[#D4A017] font-bold text-xl">CinemaVuru</div>
              <div className="text-[#7A6040] text-[10px] uppercase tracking-widest">సినిమా వూరు</div>
            </div>
          </Link>
          <p className="text-[#7A6040] text-sm">
            Join the Hyderabad filmmaking community
          </p>
        </div>

        {/* The form — client component handles interactivity */}
        <AuthForm />

      </div>
    </main>
  )
}
