'use client'
// Email admin section with subtabs: Send test | Admin alerts | Logs.

import { useState } from 'react'
import TestEmailPanel from './TestEmailPanel'
import EmailLogs from './EmailLogs'
import AdminAlertsPanel from './AdminAlertsPanel'

type Sub = 'test' | 'alerts' | 'logs'

export default function EmailAdmin() {
  const [sub, setSub] = useState<Sub>('test')

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {([
          { key: 'test',   label: 'Send Test' },
          { key: 'alerts', label: 'Admin Alerts' },
          { key: 'logs',   label: 'Logs' },
        ] as { key: Sub; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition ${
              sub === t.key
                ? 'bg-[#D4A017]/20 text-[color:var(--accent)] border border-[color:var(--accent)]/40'
                : 'bg-[color:var(--surface)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'test'   && <TestEmailPanel />}
      {sub === 'alerts' && <AdminAlertsPanel />}
      {sub === 'logs'   && <EmailLogs />}
    </div>
  )
}
