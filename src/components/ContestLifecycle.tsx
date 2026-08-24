'use client'
// Admin: full contest lifecycle control — upcoming → open → voting → closed.
//
// WHY THIS EXISTS: the admin page could only ever see contests with status
// 'open' or 'voting', and its create form hard-coded status 'open'. So there
// was no way to run a "coming soon" season, no way to set when submissions
// open, and no way to move a season forward without editing the DB by hand.
//
// Guardrails baked in, because each transition changes what the public site
// does and several of them are effectively irreversible:
//   • 'upcoming' cannot take entries (ContestEntryForm requires 'open'), so a
//     teaser season is safe to leave sitting there.
//   • Opening submissions is what actually starts taking money — confirmed.
//   • Voting needs entries to vote on, so it is blocked while there are none.
//   • Closing is handled by the existing panel (it writes the Hall of Fame).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'upcoming' | 'open' | 'voting' | 'closed'

export type LifecycleContest = {
  id: string
  title: string
  description: string | null
  status: Status
  season_number: number | null
  entry_fee: number | null
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  min_votes: number | null
  submissions_open_at: string | null
  submissions_close_at: string | null
  voting_close_at: string | null
}

const STAGES: { key: Status; label: string; hint: string }[] = [
  { key: 'upcoming', label: 'Coming soon', hint: 'Promoted on the site. Entries closed.' },
  { key: 'open',     label: 'Entries open', hint: 'Creators can submit and pay.' },
  { key: 'voting',   label: 'Voting',       hint: 'Submissions closed. Public votes.' },
  { key: 'closed',   label: 'Closed',       hint: 'Winners in the Hall of Fame.' },
]

const inr = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`

/** ISO → value for <input type="datetime-local"> in the admin's own timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'not set'

export default function ContestLifecycle({ onChanged }: { onChanged?: () => void }) {
  const [contest, setContest] = useState<LifecycleContest | null>(null)
  const [entryCount, setEntryCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [form, setForm] = useState<Partial<LifecycleContest>>({})

  const load = useCallback(async () => {
    try {
      // Include 'upcoming' — the whole point. Newest season wins.
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .in('status', ['upcoming', 'open', 'voting'])
        .order('season_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) { setErr(error.message); return }

      const row = (data as LifecycleContest) ?? null
      let paid = 0
      if (row) {
        const { count } = await supabase
          .from('contest_entries')
          .select('id', { count: 'exact', head: true })
          .eq('contest_id', row.id)
          .eq('payment_status', 'paid')
        paid = count ?? 0
      }

      setErr('')
      setContest(row)
      setForm(row ?? {})
      setEntryCount(paid)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load the contest.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function flash(ok: string) { setMsg(ok); setErr(''); setTimeout(() => setMsg(''), 4000) }

  async function save() {
    if (!contest) return
    setSaving(true); setErr('')
    const { error } = await supabase.from('contests').update({
      title:                (form.title ?? '').trim() || contest.title,
      description:          form.description ?? null,
      entry_fee:            Number(form.entry_fee ?? 0),
      prize_1st:            Number(form.prize_1st ?? 0),
      prize_2nd:            Number(form.prize_2nd ?? 0),
      prize_3rd:            Number(form.prize_3rd ?? 0),
      min_votes:            Number(form.min_votes ?? 0),
      submissions_open_at:  fromLocalInput(toLocalInput(form.submissions_open_at ?? null)),
      submissions_close_at: fromLocalInput(toLocalInput(form.submissions_close_at ?? null)),
      voting_close_at:      fromLocalInput(toLocalInput(form.voting_close_at ?? null)),
    }).eq('id', contest.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    flash('Saved. The public pages update within a minute (ISR cache).')
    await load(); onChanged?.()
  }

  async function moveTo(next: Status) {
    if (!contest) return

    if (next === 'open' && !window.confirm(
      `Open entries for Season ${contest.season_number}?\n\n` +
      `This makes the contest LIVE: creators can submit films and the entry fee ` +
      `of ${inr(contest.entry_fee)} will start being charged.\n\nProceed?`,
    )) return

    if (next === 'voting') {
      if (entryCount === 0) {
        setErr('No paid entries yet — there would be nothing to vote on. Leave entries open a while longer.')
        return
      }
      if (!window.confirm(
        `Start voting for Season ${contest.season_number}?\n\n` +
        `Submissions will CLOSE and the ${entryCount} paid ` +
        `${entryCount === 1 ? 'entry' : 'entries'} go to a public vote.\n\nProceed?`,
      )) return
    }

    setSaving(true); setErr('')
    const patch: Record<string, unknown> = { status: next }
    // Stamp the moment it actually happened if it wasn't scheduled up front.
    if (next === 'open' && !contest.submissions_open_at) patch.submissions_open_at = new Date().toISOString()
    if (next === 'voting' && !contest.submissions_close_at) patch.submissions_close_at = new Date().toISOString()

    const { error } = await supabase.from('contests').update(patch).eq('id', contest.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    flash(next === 'open' ? 'Entries are now OPEN.' : 'Voting has started.')
    await load(); onChanged?.()
  }

  const stageIndex = contest ? STAGES.findIndex(s => s.key === contest.status) : -1
  const set = <K extends keyof LifecycleContest>(k: K, v: LifecycleContest[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  if (loading) {
    return <div className="text-[color:var(--muted)] text-sm mb-6">Loading contest…</div>
  }

  if (!contest) {
    return (
      <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
        <h3 className="font-bold text-[color:var(--text)] mb-1">No contest in progress</h3>
        <p className="text-[color:var(--muted)] text-xs">
          Use “Create Contest” below to start a season. Set it to <b>Coming soon</b> first if you want to
          promote the prize money and collect registrations before entries open.
        </p>
      </div>
    )
  }

  const pool = contest.prize_1st + contest.prize_2nd + contest.prize_3rd
  const F = 'w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-sm text-[color:var(--text)] focus:outline-none focus:border-[color:var(--accent)]/50'
  const L = 'block text-[10px] uppercase tracking-widest text-[color:var(--muted)] mb-1'

  return (
    <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-bold text-[color:var(--text)]">
            Season {contest.season_number} — {contest.title}
          </h3>
          <p className="text-[color:var(--muted)] text-xs mt-0.5">
            Prize pool {inr(pool)} · {entryCount} paid {entryCount === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[color:var(--accent)]/40 text-[color:var(--accent)]">
          {STAGES[stageIndex]?.label ?? contest.status}
        </span>
      </div>

      {/* Stage stepper */}
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {STAGES.map((s, i) => {
          const done = i < stageIndex, now = i === stageIndex
          return (
            <li key={s.key}
              className={`rounded-lg border px-3 py-2 ${
                now ? 'border-[color:var(--accent)]/60 bg-[#D4A017]/10'
                    : done ? 'border-green-700/40 bg-green-900/10'
                           : 'border-[color:var(--border)] opacity-60'}`}>
              <div className={`text-xs font-bold ${now ? 'text-[color:var(--accent)]' : done ? 'text-green-400' : 'text-[color:var(--muted)]'}`}>
                {done ? '✓ ' : now ? '● ' : ''}{s.label}
              </div>
              <div className="text-[10px] text-[color:var(--muted)] mt-0.5 leading-snug">{s.hint}</div>
            </li>
          )
        })}
      </ol>

      {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
      {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}

      {/* Schedule */}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className={L}>Entries open</label>
          <input type="datetime-local" className={F}
            value={toLocalInput(form.submissions_open_at ?? null)}
            onChange={e => set('submissions_open_at', (e.target.value ? new Date(e.target.value).toISOString() : null) as never)} />
          <p className="text-[10px] text-[color:var(--faint)] mt-1">
            Drives the public countdown. Blank shows “Dates announced soon”.
          </p>
        </div>
        <div>
          <label className={L}>Entries close</label>
          <input type="datetime-local" className={F}
            value={toLocalInput(form.submissions_close_at ?? null)}
            onChange={e => set('submissions_close_at', (e.target.value ? new Date(e.target.value).toISOString() : null) as never)} />
        </div>
        <div>
          <label className={L}>Voting closes</label>
          <input type="datetime-local" className={F}
            value={toLocalInput(form.voting_close_at ?? null)}
            onChange={e => set('voting_close_at', (e.target.value ? new Date(e.target.value).toISOString() : null) as never)} />
        </div>
      </div>

      {/* Prizes + money */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div><label className={L}>1st prize</label>
          <input type="number" min={0} className={F} value={form.prize_1st ?? 0}
            onChange={e => set('prize_1st', Number(e.target.value) as never)} /></div>
        <div><label className={L}>2nd prize</label>
          <input type="number" min={0} className={F} value={form.prize_2nd ?? 0}
            onChange={e => set('prize_2nd', Number(e.target.value) as never)} /></div>
        <div><label className={L}>3rd prize</label>
          <input type="number" min={0} className={F} value={form.prize_3rd ?? 0}
            onChange={e => set('prize_3rd', Number(e.target.value) as never)} /></div>
        <div><label className={L}>Entry fee</label>
          <input type="number" min={0} className={F} value={form.entry_fee ?? 0}
            onChange={e => set('entry_fee', Number(e.target.value) as never)} /></div>
        <div><label className={L}>Min votes</label>
          <input type="number" min={0} className={F} value={form.min_votes ?? 0}
            onChange={e => set('min_votes', Number(e.target.value) as never)} /></div>
      </div>

      <div className="mb-4">
        <label className={L}>Title</label>
        <input className={F} value={form.title ?? ''} onChange={e => set('title', e.target.value as never)} />
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={save} disabled={saving}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        {contest.status === 'upcoming' && (
          <button onClick={() => moveTo('open')} disabled={saving}
            className="border border-green-700/50 text-green-400 px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-green-900/20 disabled:opacity-50">
            ▶ Open entries now
          </button>
        )}
        {contest.status === 'open' && (
          <button onClick={() => moveTo('voting')} disabled={saving}
            className="border border-[color:var(--accent)]/50 text-[color:var(--accent)] px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-[#D4A017]/10 disabled:opacity-50">
            🗳 Start voting
          </button>
        )}
        {contest.status === 'voting' && (
          <span className="text-[color:var(--muted)] text-xs">
            Use “Close Contest” below to finish the season and publish winners.
          </span>
        )}
        <button onClick={load} className="text-xs text-[color:var(--muted)] underline hover:text-[color:var(--text)]">
          Refresh
        </button>
      </div>

      <p className="text-[color:var(--faint)] text-[11px] mt-3 leading-relaxed">
        Currently: entries open {fmtWhen(contest.submissions_open_at)} · close {fmtWhen(contest.submissions_close_at)} ·
        voting ends {fmtWhen(contest.voting_close_at)}.
        {contest.status === 'upcoming' && ' While “Coming soon”, the public site promotes the prize money but cannot accept entries.'}
      </p>
    </div>
  )
}
