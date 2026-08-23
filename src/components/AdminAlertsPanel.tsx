'use client'
// Admin utility: shows exactly who receives admin alert emails, and lets an
// admin run the daily digest on demand.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DigestSummary = {
  pending: number
  overdue: number
  paidLast24h: number
  unpaidEntries: number
  newUsersLast24h: number
  errorsLast24h: number
}

const ALERTS = [
  ['🎬 New film submitted',      'Instantly, the moment a film lands in pending review.'],
  ['⏰ Daily digest',            'Every morning: pending queue, overdue films, signups, errors.'],
  ['💰 Contest entry paid',      'Instantly, when an entry fee is confirmed by the gateway.'],
  ['🚨 Payment not recorded',    'Payment succeeded but the entry did not flip to paid — needs a manual fix.'],
  ['🚨 Signature check failed',  'A payment callback failed verification (throttled to 1 per 30 min).'],
]

export default function AdminAlertsPanel() {
  const [recipients, setRecipients] = useState<string[] | null>(null)
  const [emailConfigured, setEmailConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [summary, setSummary] = useState<DigestSummary | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/notify', {
        headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not load recipients.')
      setRecipients(j.recipients ?? [])
      setEmailConfigured(Boolean(j.emailConfigured))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load recipients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function sendDigest() {
    setRunning(true); setErr(''); setMsg(''); setSummary(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cron/admin-digest?force=1', {
        method: 'POST',
        headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Digest failed.')
      setSummary(j.summary ?? null)
      setMsg(
        j.sent
          ? `✅ Digest sent to ${j.sent} admin${j.sent === 1 ? '' : 's'}${j.failed ? ` (${j.failed} failed)` : ''}`
          : `⚠️ Nothing sent${j.skipped ? ` — ${j.skipped.replace(/_/g, ' ')}` : ''}`,
      )
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Digest failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[color:var(--text)] mb-1">🔔 Admin alert recipients</h3>
        <p className="text-[color:var(--muted)] text-xs mb-4">
          Every account with the <strong>admin</strong> role gets these emails, plus any address in
          {' '}<code className="text-[color:var(--accent)]">ADMIN_EMAIL</code> /
          {' '}<code className="text-[color:var(--accent)]">ADMIN_EMAILS</code>. Promote a user to admin and they are
          added automatically — no redeploy.
        </p>

        {loading && <p className="text-[color:var(--muted)] text-sm">Loading…</p>}

        {!loading && recipients && recipients.length === 0 && (
          <p className="text-red-400 text-sm">
            No recipients found. No admin alerts can be delivered — set ADMIN_EMAIL or give a profile role=&apos;admin&apos;.
          </p>
        )}

        {!loading && !!recipients?.length && (
          <ul className="space-y-1.5 mb-3">
            {recipients.map(r => (
              <li key={r} className="text-sm text-[color:var(--text)] flex items-center gap-2">
                <span className="text-green-400">●</span>{r}
              </li>
            ))}
          </ul>
        )}

        {!emailConfigured && (
          <p className="text-yellow-400 text-xs">
            RESEND_API_KEY is not set on this server — alerts are logged but not delivered.
          </p>
        )}

        <button
          onClick={load}
          className="mt-2 text-xs text-[color:var(--muted)] underline hover:text-[color:var(--text)]"
        >
          Refresh
        </button>
      </div>

      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[color:var(--text)] mb-3">What triggers an alert</h3>
        <ul className="space-y-2.5">
          {ALERTS.map(([title, when]) => (
            <li key={title}>
              <div className="text-sm font-semibold text-[color:var(--text)]">{title}</div>
              <div className="text-xs text-[color:var(--muted)]">{when}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[color:var(--text)] mb-1">Run the daily digest now</h3>
        <p className="text-[color:var(--muted)] text-xs mb-4">
          Sends the &ldquo;what needs your attention&rdquo; email to all admins immediately — useful to confirm delivery.
        </p>

        {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
        {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}

        {summary && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            {([
              ['Pending', summary.pending],
              ['Overdue', summary.overdue],
              ['Paid 24h', summary.paidLast24h],
              ['Unpaid', summary.unpaidEntries],
              ['New users', summary.newUsersLast24h],
              ['Errors 24h', summary.errorsLast24h],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} className="bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg py-2">
                <div className="text-lg font-bold text-[color:var(--accent)]">{val}</div>
                <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{label}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={sendDigest}
          disabled={running}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide disabled:opacity-50 hover:opacity-90 transition"
        >
          {running ? 'Sending…' : 'Send digest now'}
        </button>
      </div>
    </div>
  )
}
