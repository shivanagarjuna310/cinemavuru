'use client'
// Admin utility: send a sample milestone email to verify delivery works.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestEmailPanel() {
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setTo(data.user.email) })
  }, [])

  async function send() {
    setErr(''); setMsg(''); setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ to: to.trim() }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed to send.')
      setMsg(`✅ Test email sent to ${j.to}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-lg bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6">
      <h3 className="text-base font-bold text-[color:var(--text)] mb-1">📧 Send a test email</h3>
      <p className="text-[color:var(--muted)] text-xs mb-5">
        Sends a sample <strong>milestone</strong> email so you can confirm delivery + how it looks. Uses the live Resend sender.
      </p>

      <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Recipient</label>
      <input
        type="email"
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder="you@example.com"
        className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-3.5 py-2.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition mb-3"
      />

      {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
      {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}

      <button
        onClick={send}
        disabled={sending || !to.trim()}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide disabled:opacity-50 hover:opacity-90 transition"
      >
        {sending ? 'Sending…' : 'Send test email'}
      </button>

      <p className="text-[color:var(--faint)] text-[11px] mt-3">
        Note: needs RESEND_API_KEY on the server — works in production; a local dev server without the key will report it.
      </p>
    </div>
  )
}
