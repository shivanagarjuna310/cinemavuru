// GET/POST /api/cron/admin-digest
// Daily "what needs your attention" email to EVERY admin:
//   • films sitting in pending review (with how long they have waited)
//   • contest entries paid in the last 24h + entries still unpaid
//   • new signups in the last 24h
//   • error/critical logs in the last 24h
//
// This is also the safety net for the instant "new film submitted" alert: if
// that fetch never lands (tab closed, offline, email hiccup), the film still
// shows up here the next day.
//
// Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; you can also
// trigger it manually with ?secret=<CRON_SECRET>, or with an admin's own
// access token (that is what the button in the admin panel uses).
// The digest always sends, including on quiet days -- see the note by the
// summary below for why. (?force=1 is still accepted and ignored, so the
// admin panel's existing 'Send digest now' button keeps working.)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, esc, SITE } from '@/lib/adminNotify'
import { autoAdvanceContest } from '@/lib/contestSchedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const OVERDUE_HOURS = 24
const LIST_LIMIT = 10

type AuthVerdict = { ok: true } | { ok: false; reason: string }

async function authorized(req: Request): Promise<AuthVerdict> {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const auth = req.headers.get('authorization') ?? ''

  if (secret) {
    if (auth === `Bearer ${secret}` || url.searchParams.get('secret') === secret) return { ok: true }
  }

  // Allow a logged-in admin to run it on demand from the panel.
  const token = auth.replace(/^Bearer\s+/i, '')
  if (token) {
    const { data } = await admin.auth.getUser(token)
    if (data?.user) {
      const { data: prof } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if ((prof as { role?: string } | null)?.role === 'admin') return { ok: true }
    }
  }

  // No secret configured → allow manual runs in local dev only. In production
  // an unset CRON_SECRET must NOT leave this open: anyone could otherwise
  // trigger admin emails and read the summary counts.
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return { ok: true }
    // Say WHY out loud — otherwise this looks like a mystery 401 in the Vercel
    // cron log and the daily digest silently never sends.
    return {
      ok: false,
      reason:
        'CRON_SECRET is not set on this deployment. Vercel Cron only authenticates ' +
        'when that variable exists, so this job cannot run. Add CRON_SECRET in ' +
        'Project → Settings → Environment Variables and redeploy.',
    }
  }
  return { ok: false, reason: 'Bad or missing credentials.' }
}

function ago(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'under 1h'
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export async function GET(req: Request) { return run(req) }
export async function POST(req: Request) { return run(req) }

async function run(req: Request) {
  const auth = await authorized(req)
  if (!auth.ok) {
    console.error('[admin-digest] refused:', auth.reason)
    return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 })
  }
  // Backstop for the scheduled transitions, in case nobody loads /contest
  // around the deadline (that page normally triggers them on revalidation).
  const advanced = await autoAdvanceContest()
  if (advanced.changed) {
    await notifyAdmins({
      kind: advanced.to === 'open' ? 'contest_opened' : 'contest_voting_started',
      tone: 'good',
      subject: advanced.to === 'open'
        ? `Contest entries are now OPEN — ${advanced.title}`
        : `Voting has started — ${advanced.title}`,
      heading: advanced.to === 'open' ? 'Contest opened automatically' : 'Voting started automatically',
      intro: advanced.to === 'open'
        ? 'The scheduled start time passed, so entries are now open and the entry fee is being charged.'
        : 'Submissions closed on schedule, so the season moved to public voting.',
      rows: advanced.to === 'open'
        ? [['Contest', advanced.title]]
        : [['Contest', advanced.title], ['Entries in the vote', String(advanced.entryCount ?? 0)]],
      ctaLabel: 'Open Admin Panel',
    }).catch(() => {})
  } else if (advanced.reason === 'no_entries') {
    // Submissions were due to close but there is nothing to vote on. Needs a
    // human decision — extend the window, or accept the season has no entries.
    await notifyAdmins({
      kind: 'contest_no_entries',
      tone: 'danger',
      subject: 'Contest was due to start voting but has NO entries',
      heading: 'Voting could not start',
      intro:
        'The submission deadline passed but no paid, approved entries exist, so voting was not started ' +
        'and submissions remain open. Extend the deadline or decide how to handle the season.',
      ctaLabel: 'Open Admin Panel',
      throttleMinutes: 20 * 60,
    }).catch(() => {})
  }

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString()

  // ── Gather. Each block is independently fault-tolerant so one missing
  //    table never kills the whole digest.
  const pending = await safe(() =>
    admin
      .from('films')
      .select('id, title_en, created_at, creator_id, districts(name_en)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  )
  const pendingRows = (pending ?? []) as {
    id: string; title_en: string; created_at: string; creator_id: string
    districts: { name_en?: string } | { name_en?: string }[] | null
  }[]
  const overdue = pendingRows.filter(
    f => Date.now() - new Date(f.created_at).getTime() > OVERDUE_HOURS * 3_600_000,
  )

  const paid24 = await safeCount(() =>
    admin
      .from('contest_entries')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .gte('created_at', since),
  )
  const unpaid = await safeCount(() =>
    admin
      .from('contest_entries')
      .select('id', { count: 'exact', head: true })
      .neq('payment_status', 'paid'),
  )
  const newUsers = await safeCount(() =>
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
  )
  const errors = await safeCount(() =>
    admin
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .in('level', ['error', 'critical'])
      .gte('created_at', since),
  )

  const summary = {
    pending: pendingRows.length,
    overdue: overdue.length,
    paidLast24h: paid24,
    unpaidEntries: unpaid,
    newUsersLast24h: newUsers,
    errorsLast24h: errors,
  }

  // The digest always sends — it is a daily heartbeat, not an alert.
  //
  // It used to stay silent unless something was "actionable" (pending films,
  // errors, or payments). That backfired: on a quiet day no email arrived, and
  // silence is indistinguishable from a broken cron, an expired RESEND_API_KEY,
  // or a failed deploy. A short "queue clear" email every morning proves the
  // whole pipeline still works. Two admins x 1 email/day is ~60/month against
  // a 3,000/month Resend allowance, so the noise costs nothing.
  //
  // (The old gate also ignored new signups entirely, so a day with 2 new users
  // and nothing else still sent nothing.)

  // ── Compose.
  const filmList = pendingRows.slice(0, LIST_LIMIT).map(f => {
    const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
    const late = Date.now() - new Date(f.created_at).getTime() > OVERDUE_HOURS * 3_600_000
    return `
      <tr>
        <td style="padding:8px 12px 8px 0;color:#FDF6E3;font-size:14px;">${esc(f.title_en)}</td>
        <td style="padding:8px 12px 8px 0;color:#7A6040;font-size:13px;">${esc(d?.name_en ?? '—')}</td>
        <td style="padding:8px 0;font-size:13px;font-weight:700;color:${late ? '#ef4444' : '#FFC845'};">
          waiting ${esc(ago(f.created_at))}
        </td>
      </tr>`
  }).join('')

  const more = pendingRows.length > LIST_LIMIT
    ? `<p style="color:#7A6040;font-size:12px;margin:8px 0 0;">+ ${pendingRows.length - LIST_LIMIT} more pending in the admin panel.</p>`
    : ''

  const pendingBlock = pendingRows.length
    ? `
      <div style="background:#1A1208;border:1px solid #2E2010;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="color:#7A6040;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
          Films awaiting review
        </div>
        <table style="width:100%;border-collapse:collapse;"><tbody>${filmList}</tbody></table>
        ${more}
      </div>`
    : `<p style="color:#22c55e;font-size:14px;margin:0 0 20px;">No films waiting for review. Queue is clear.</p>`

  const heading = summary.overdue > 0
    ? `${summary.overdue} film${summary.overdue === 1 ? '' : 's'} overdue for review`
    : summary.pending > 0
      ? `${summary.pending} film${summary.pending === 1 ? '' : 's'} awaiting review`
      : 'Daily admin summary'

  const subject = summary.pending > 0
    ? `Admin daily — ${summary.pending} film${summary.pending === 1 ? '' : 's'} awaiting review`
    : 'Admin daily — queue clear'

  const result = await notifyAdmins({
    kind: 'daily_digest',
    tone: summary.overdue > 0 ? 'danger' : summary.pending > 0 ? 'warn' : 'good',
    subject,
    heading,
    intro: 'Here is what happened on CinemaVuru in the last 24 hours.',
    bodyHtml: pendingBlock,
    rows: [
      ['Pending', String(summary.pending)],
      ['Overdue', `${summary.overdue} (waiting over ${OVERDUE_HOURS}h)`],
      ['Entries paid', `${summary.paidLast24h} in last 24h`],
      ['Entries unpaid', String(summary.unpaidEntries)],
      ['New users', `${summary.newUsersLast24h} in last 24h`],
      ['Errors', `${summary.errorsLast24h} in last 24h`],
    ],
    ctaLabel: 'Open Admin Panel',
    ctaPath: '/cv-admin-1a25',
  })

  return NextResponse.json({ ...result, summary, site: SITE })
}

// ── Fault-tolerant query helpers ──────────────────────────────────────────

async function safe<T>(q: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data } = await q()
    return data ?? null
  } catch {
    return null
  }
}

async function safeCount(q: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count } = await q()
    return count ?? 0
  } catch {
    return 0
  }
}
