'use client'
// src/components/AuthForm.tsx

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { supabase }  from '@/lib/supabase'

type Tab    = 'login' | 'register' | 'forgot'
type Status = 'idle' | 'loading' | 'success' | 'error'

// Map raw Supabase auth errors to friendly, human messages
function friendlyError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Incorrect email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email — check your inbox for the link.'
  if (m.includes('already registered') || m.includes('already exists')) return 'An account with this email already exists. Please log in instead.'
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a moment and try again.'
  if (m.includes('password') && m.includes('6')) return 'Password must be at least 6 characters.'
  return msg
}

export default function AuthForm() {
  const router = useRouter()
//routes
  const [tab,      setTab]      = useState<Tab>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status,   setStatus]   = useState<Status>('idle')
  const [message,  setMessage]  = useState('')
  async function handleGoogleLogin() {
    setStatus('loading')
    setMessage('')
    // Redirect back to the site root — the browser client (detectSessionInUrl)
    // exchanges the code there and establishes the session client-side.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) {
      setStatus('error')
      setMessage(
        /provider is not enabled|unsupported provider/i.test(error.message)
          ? 'Google sign-in isn’t enabled yet. Enable the Google provider in Supabase → Authentication → Providers.'
          : friendlyError(error.message),
      )
    }
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanName  = name.trim()

    // ── Forgot Password ──────────────────────────────────────
    if (tab === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) {
        setStatus('error')
        setMessage(friendlyError(error.message))
      } else {
        setStatus('success')
        setMessage('✅ Password reset link sent! Check your email inbox.')
      }
      return
    }

    if (tab === 'register') {

      // Step 1 — create the auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { name: cleanName } },
      })

      if (signUpError) {
        setStatus('error')
        setMessage(friendlyError(signUpError.message))
        return
      }

      // Supabase silently "succeeds" for existing emails
      // (identities array is empty when the email is already registered)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setStatus('error')
        setMessage('An account with this email already exists. Please log in instead.')
        setTab('login')
        return
      }

      // Step 2 — create the profile row (best-effort; runs while the
      // fresh session is active when email confirmation is disabled)
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: data.user.id, name: cleanName })
        if (profileError) console.warn('Profile creation warning:', profileError.message)
      }

      // Step 3 — if a session was created, the user is already signed in
      // (email confirmation disabled) → take them straight into the app.
      if (data.session) {
        router.push('/')
        router.refresh()
        return
      }

      // Otherwise email confirmation is required — tell them to check inbox.
      setStatus('success')
      setMessage('✅ Account created! Check your email to confirm, then log in.')
      setTab('login')

    } else {

      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setStatus('error')
        setMessage(friendlyError(error.message))
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
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8">

      {/* Tabs — only Login and Register, Forgot is a sub-state */}
      {tab !== 'forgot' && (
        <div className="flex border-b border-[color:var(--border)] mb-6">
          {(['login', 'register'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition border-b-2 ${
                tab === t
                  ? 'text-[color:var(--accent)] border-[color:var(--accent)]'
                  : 'text-[color:var(--muted)] border-transparent hover:text-[color:var(--text)]'
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
            className="text-[color:var(--muted)] hover:text-[color:var(--accent)] text-xs uppercase tracking-widest transition flex items-center gap-1 mb-4"
          >
            ← Back to Login
          </button>
          <h2 className="text-[color:var(--accent)] font-bold text-lg">Reset Password</h2>
          <p className="text-[color:var(--muted)] text-sm mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {tab === 'register' && (
          <div>
            <label htmlFor="auth-name" className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <input
              id="auth-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            inputMode="email"
            required
            className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
          />
        </div>

        {tab !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password" className="block text-xs text-[color:var(--muted)] uppercase tracking-widest">
                Password
              </label>
              {/* Forgot password link — only on login tab */}
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => switchTab('forgot')}
                  className="text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Min 6 characters' : '••••••••'}
                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg pl-4 pr-11 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[color:var(--muted)] hover:text-[color:var(--accent)] transition"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.5 13.5 0 0 0 1 12s4 7 11 7a9.12 9.12 0 0 0 5.39-1.61" />
                    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    <path d="m1 1 22 22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
        <p className="text-center text-xs text-[color:var(--faint)] mt-6">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
            className="text-[color:var(--accent)] hover:underline"
          >
            {tab === 'login' ? 'Sign up free' : 'Login here'}
          </button>
        </p>
      )}
      {tab !== 'forgot' && (
  <>
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[color:var(--border)]" />
      <span className="text-[color:var(--faint)] text-xs uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-[color:var(--border)]" />
    </div>

    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 bg-[color:var(--bg)] border border-[color:var(--border)] hover:border-[color:var(--accent)]/50 text-[color:var(--text)] py-3 rounded-lg font-medium text-sm transition"
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
