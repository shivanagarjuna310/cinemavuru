'use client'
// src/app/auth/reset/page.tsx
// User lands here after clicking the reset link in their email
// Supabase automatically logs them in via the URL token
// They just need to set a new password

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'
import { supabase }            from '@/lib/supabase'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [status,    setStatus]    = useState<Status>('idle')
  const [message,   setMessage]   = useState('')
  const [validLink, setValidLink] = useState(false)

  // Check if user arrived via a valid reset link
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidLink(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }
    setStatus('loading')
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('success')
      setMessage('✅ Password updated! Redirecting to login...')
      setTimeout(() => router.push('/auth'), 2500)
    }
  }

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
        </div>

        <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8">

          <h2 className="text-[#D4A017] font-bold text-lg mb-1">Set New Password</h2>
          <p className="text-[#7A6040] text-sm mb-6">Choose a strong password for your account.</p>

          {!validLink ? (
            <div className="text-center py-4">
              <p className="text-[#7A6040] text-sm mb-4">
                This link is invalid or has expired.
              </p>
              <Link href="/auth"
                className="text-[#D4A017] hover:underline text-sm">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={6}
                  className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
                />
              </div>

              {message && (
                <div className={`rounded-lg px-4 py-3 text-sm ${
                  status === 'error'
                    ? 'bg-red-900/30 border border-red-700/40 text-red-300'
                    : 'bg-green-900/30 border border-green-700/40 text-green-300'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {status === 'loading' ? 'Updating...' : 'Update Password →'}
              </button>

            </form>
          )}
        </div>
      </div>
    </main>
  )
}
