// src/components/ErrorLogViewer.tsx
// Shows technical error logs in the admin dashboard.
// Only visible to admins. Shows function calls, errors, timing.

'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type ErrorLog = {
  id: string
  level: string
  source: string
  function_name: string | null
  message: string
  error_code: string | null
  error_detail: string | null
  duration_ms: number | null
  request_data: Record<string, unknown>
  created_at: string
  profiles: { name: string | null } | null
}

const LEVEL_STYLE: Record<string, string> = {
  debug:    'text-gray-400   bg-gray-400/10',
  info:     'text-blue-400   bg-blue-400/10',
  warn:     'text-yellow-400 bg-yellow-400/10',
  error:    'text-red-400    bg-red-400/10',
  critical: 'text-red-300    bg-red-600/20',
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function ErrorLogViewer() {
  const [logs,       setLogs]       = useState<ErrorLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<string>('all')
  const [search,     setSearch]     = useState('')
  const [expanded,   setExpanded]   = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('error_logs')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filter !== 'all') {
      query = query.eq('level', filter)
    }

    const { data } = await query
    setLogs((data as ErrorLog[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function cleanLogs() {
    await supabase.rpc('cleanup_error_logs')
    fetchLogs()
  }

  const counts = logs.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const q = search.trim().toLowerCase()
  const visible = q
    ? logs.filter(l =>
        (l.message?.toLowerCase().includes(q)) ||
        (l.source?.toLowerCase().includes(q)) ||
        (l.function_name?.toLowerCase().includes(q) ?? false))
    : logs

  return (
    <div>
      {/* Summary row */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['all', 'error', 'warn', 'info', 'debug'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide transition border ${
              filter === f
                ? 'border-[color:var(--accent)]/40 text-[color:var(--accent)] bg-[#D4A017]/10'
                : 'border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)]'
            }`}>
            {f} {f !== 'all' && counts[f] ? `(${counts[f]})` : f === 'all' ? `(${logs.length})` : ''}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search message / source..."
          className="ml-auto w-52 bg-[color:var(--surface)] border border-[color:var(--border)] rounded px-3 py-1 text-xs text-[color:var(--text)] placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50"
        />
        <button onClick={fetchLogs}
          className="px-3 py-1 rounded text-xs border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition">
          ↻ Refresh
        </button>
        <button onClick={cleanLogs}
          className="px-3 py-1 rounded text-xs border border-red-700/30 text-red-400 hover:bg-red-900/20 transition">
          🗑 Clean (7d+)
        </button>
      </div>

      {/* Counts summary */}
      {counts.error > 0 && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-2 mb-4 text-sm text-red-300">
          ⚠️ {counts.error} error{counts.error > 1 ? 's' : ''} detected
          {counts.critical ? ` · ${counts.critical} critical` : ''}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[color:var(--muted)] text-sm">Loading logs...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-[color:var(--muted)]">
          <p className="text-3xl mb-2">{q ? '🔍' : '✅'}</p>
          <p className="text-sm">{q ? 'No logs match your search' : `No ${filter === 'all' ? '' : filter} logs`}</p>
        </div>
      ) : (
        <div className="bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl overflow-hidden font-mono text-xs">
          {visible.map((log, i) => (
            <div key={log.id}>
              <div
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] ${i !== 0 ? 'border-t border-[color:var(--surface)]' : ''}`}
              >
                {/* Level badge */}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 w-14 text-center ${LEVEL_STYLE[log.level] ?? 'text-gray-400'}`}>
                  {log.level}
                </span>

                {/* Source.function */}
                <span className="text-[color:var(--accent)] flex-shrink-0 w-48 truncate">
                  {log.source}{log.function_name ? `.${log.function_name}` : ''}
                </span>

                {/* Message */}
                <span className="text-[color:var(--text)]/70 flex-1 truncate">{log.message}</span>

                {/* Duration */}
                {log.duration_ms != null && (
                  <span className={`flex-shrink-0 w-16 text-right ${log.duration_ms > 2000 ? 'text-yellow-400' : 'text-[color:var(--faint)]'}`}>
                    {log.duration_ms}ms
                  </span>
                )}

                {/* Time */}
                <span className="text-[color:var(--faint)] flex-shrink-0 w-16 text-right">
                  {timeAgo(log.created_at)}
                </span>

                {/* Expand indicator */}
                <span className="text-[color:var(--faint)] flex-shrink-0">
                  {expanded === log.id ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === log.id && (
                <div className="bg-[color:var(--bg)] border-t border-[color:var(--border)] px-6 py-4 space-y-2">
                  {log.error_code && (
                    <div><span className="text-red-400">Error code: </span><span className="text-[color:var(--text)]">{log.error_code}</span></div>
                  )}
                  {log.error_detail && (
                    <div><span className="text-red-400">Detail: </span><span className="text-[color:var(--text)]/70">{log.error_detail}</span></div>
                  )}
                  {Object.keys(log.request_data ?? {}).length > 0 && (
                    <div>
                      <div className="text-[color:var(--muted)] mb-1">Request data:</div>
                      <pre className="text-[color:var(--text)]/60 bg-[color:var(--bg)] rounded p-2 overflow-x-auto text-[10px]">
                        {JSON.stringify(log.request_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="text-[color:var(--faint)]">
                    {new Date(log.created_at).toLocaleString()} · {log.profiles?.name ?? 'anonymous'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
