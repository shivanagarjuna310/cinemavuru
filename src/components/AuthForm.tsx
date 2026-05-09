'use client'
// src/components/AuthForm.tsx

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { supabase }  from '@/lib/supabase'

type Tab    = 'login' | 'register' | 'forgot'
type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AuthForm() {
  const router = useRouter()

  const [tab,      setTab]      = useState<Tab>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [status,   setStatus]   = useState<Status>('idle')
  const [message,  setMessage]  = useState('')
  async function handleGoogleLogin() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    // ── Forgot Password ──────────────────────────────────────
    if (tab === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('success')
        setMessage('✅ Password reset link sent! Check your email inbox.')
      }
      return
    }

    if (tab === 'register') {

      // Step 1 — create the auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })

      if (signUpError) {
        setStatus('error')
        setMessage(signUpError.message)
        return
      }

      // Supabase silently "succeeds" for existing emails
      // identities array is empty when email already registered
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setStatus('error')
        setMessage('An account with this email already exists. Please login instead.')
        setTab('login')
        return
      }

      // Step 2 — manually create the profile row
      // (more reliable than trigger)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id:   data.user.id,
            name: name,
          })

        if (profileError) {
          // Profile insert failed — but auth user was created
          // Not a blocker, just log it
          console.warn('Profile creation warning:', profileError.message)
        }
      }

      setStatus('success')
      setMessage('✅ Account created! You can now login.')
      setTab('login')

    } else {

      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setStatus('idle')
    setMessage('')
  }

  return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8">

      {/* Tabs — only Login and Register, Forgot is a sub-state */}
      {tab !== 'forgot' && (
        <div className="flex border-b border-[#2E2010] mb-6">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition border-b-2 ${
                tab === t
                  ? 'text-[#D4A017] border-[#D4A017]'
                  : 'text-[#7A6040] border-transparent hover:text-[#FDF6E3]'
              }`}
            >
              {t === 'login' ? 'Login' : 'Create Account'}
            </button>
          ))}
        </div>
      )}

      {/* Forgot password header */}
      {tab === 'forgot' && (
        <div className="mb-6">
          <button
            onClick={() => switchTab('login')}
            className="text-[#7A6040] hover:text-[#D4A017] text-xs uppercase tracking-widest transition flex items-center gap-1 mb-4"
          >
            ← Back to Login
          </button>
          <h2 className="text-[#D4A017] font-bold text-lg">Reset Password</h2>
          <p className="text-[#7A6040] text-sm mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {tab === 'register' && (
          <div>
            <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
          />
        </div>

        {tab !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-[#7A6040] uppercase tracking-widest">
                Password
              </label>
              {/* Forgot password link — only on login tab */}
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs text-[#7A6040] hover:text-[#D4A017] transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'register' ? 'Min 6 characters' : '••••••••'}
              required
              minLength={6}
              className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
            />
          </div>
        )}

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
          disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {status === 'loading'
            ? 'Please wait...'
            : tab === 'login'    ? 'Login →'
            : tab === 'register' ? 'Create Account →'
            : 'Send Reset Link →'}
        </button>

      </form>

      {tab !== 'forgot' && (
        <p className="text-center text-xs text-[#4A3020] mt-6">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
            className="text-[#D4A017] hover:underline"
          >
            {tab === 'login' ? 'Sign up free' : 'Login here'}
          </button>
        </p>
      )}
      {tab !== 'forgot' && (
  <>
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[#2E2010]" />
      <span className="text-[#4A3020] text-xs uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-[#2E2010]" />
    </div>

    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 bg-[#0D0A06] border border-[#2E2010] hover:border-[#D4A017]/50 text-[#FDF6E3] py-3 rounded-lg font-medium text-sm transition"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continue with Google
    </button>
  </>
)}
    </div>
  )
}
