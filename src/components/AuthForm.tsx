'use client'
// src/components/AuthForm.tsx

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { supabase }  from '@/lib/supabase'

type Tab    = 'login' | 'register'
type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AuthForm() {
  const router = useRouter()

  const [tab,      setTab]      = useState<Tab>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [status,   setStatus]   = useState<Status>('idle')
  const [message,  setMessage]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

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

      {/* Tabs */}
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

        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Password
          </label>
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
            : tab === 'login' ? 'Login →' : 'Create Account →'}
        </button>

      </form>

      <p className="text-center text-xs text-[#4A3020] mt-6">
        {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
          className="text-[#D4A017] hover:underline"
        >
          {tab === 'login' ? 'Sign up free' : 'Login here'}
        </button>
      </p>

    </div>
  )
}
