'use client'
// Admin view of sent emails (milestone + test), newest first.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string; kind: string; to_email: string; subject: string | null
  status: string; error: string | null; created_at: string
}

function when(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${dd}d ago`
}

export default function EmailLogs() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [kind, setKind] = useState('all')

  async function load() {
    setLoading(true); setErr('')
    let q = supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(150)
    if (kind !== 'all') q = q.eq('kind', kind)
    const { data, error } = await q
    if (error) setErr(error.message)
    setRows((data as Row[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {['all', 'milestone', 'test'].map(k => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition ${
              kind === k ? 'bg-[#D4A017]/20 text-[color:var(--accent)] border border-[color:var(--accent)]/40'
                         : 'bg-[color:var(--surface)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
            {k}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition">↻ Refresh</button>
      </div>

      {err && (
        <p className="text-red-400 text-sm mb-3">
          {err} <span className="text-[color:var(--faint)]">— run EMAIL_LOGS_SETUP.sql if the table is missing.</span>
        </p>
      )}

      {loading ? (
        <p className="text-[color:var(--muted)] text-sm py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-[color:var(--muted)]">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm">No emails logged yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[color:var(--border)] rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--muted)] text-xs uppercase tracking-wide border-b border-[color:var(--border)]">
                <th className="px-3 py-2.5 font-semibold">When</th>
                <th className="px-3 py-2.5 font-semibold">Kind</th>
                <th className="px-3 py-2.5 font-semibold">To</th>
                <th className="px-3 py-2.5 font-semibold hidden sm:table-cell">Subject</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="px-3 py-2.5 text-[color:var(--muted)] whitespace-nowrap" title={new Date(r.created_at).toLocaleString()}>{when(r.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[color:var(--surface)] text-[color:var(--accent)] border border-[color:var(--border)]">{r.kind}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--text)] max-w-[180px] truncate" title={r.to_email}>{r.to_email}</td>
                  <td className="px-3 py-2.5 text-[color:var(--muted)] hidden sm:table-cell max-w-[260px] truncate" title={r.subject ?? ''}>{r.subject}</td>
                  <td className="px-3 py-2.5">
                    {r.status === 'sent' ? (
                      <span className="text-green-400 font-semibold text-xs">✓ Sent</span>
                    ) : (
                      <span className="text-red-400 font-semibold text-xs" title={r.error ?? ''}>✕ Failed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
