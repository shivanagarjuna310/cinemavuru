// SERVER-ONLY. Broadcasts a contest announcement to every registered user.
//
// Two phases, each with its own dedupe bucket in email_logs so a user can get
// the "starts soon" teaser AND the "entries are open" mail, but never the same
// one twice:
//   teaser -> kind `contest_announce:<id>`         (submissions not open yet)
//   open   -> kind `contest_announce:<id>:open`    (submissions now open)
//
// The teaser deliberately keeps the unsuffixed kind: Season 1's teaser already
// went out under it, and those rows must keep suppressing a repeat.
//
// Callers: the admin route (manual/dry-run) and autoAdvanceContest(), which
// fires the `open` phase the moment the season flips to open.

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { esc } from '@/lib/adminNotify'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function getResend(): Resend | null {
  const k = process.env.RESEND_API_KEY
  return k ? new Resend(k) : null
}

// A bare address shows in inboxes as "noreply", so always carry a display name.
// `||` not `??` — an env var set to an empty string must fall back too.
const FROM_RAW = process.env.FROM_EMAIL?.trim() || 'noreply@cinemavuru.com'
const FROM = FROM_RAW.includes('<') ? FROM_RAW : `CinemaVuru <${FROM_RAW}>`

// Resend rejects an address without a proper domain, and one bad entry fails a
// whole batch — so screen them out before they reach the send.
const EMAIL_OK = /^[^\s@<>,;"']+@[^\s@<>,;"'.]+(\.[^\s@<>,;"'.]+)+$/
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'
// Must be reachable by mail clients, so it can't be a localhost path. Point
// CONTEST_POSTER_URL at storage/CDN; the site-relative file is the fallback.
const POSTER_URL = process.env.CONTEST_POSTER_URL?.trim() || `${SITE}/contest-poster.jpg`

// Resend caps a batch call at 100 messages; the pause keeps us under the
// per-second request limit when a run spans many batches.
const BATCH_SIZE = 100
const BATCH_PAUSE_MS = 1100
// Ceiling per invocation so one call can never run away. Re-run to continue —
// already-mailed addresses are skipped via email_logs.
export const MAX_PER_RUN = 2000

export type Phase = 'teaser' | 'open'

export type Contest = {
  id: string
  title: string | null
  season_number: number | null
  entry_fee: number | null
  prize_1st: number | null
  prize_2nd: number | null
  prize_3rd: number | null
  submissions_open_at: string | null
  submissions_close_at: string | null
  voting_close_at: string | null
}

// Used when the contest row leaves a field null.
const FALLBACK = {
  entry_fee: 49,
  prize_1st: 9999,
  prize_2nd: 7000,
  prize_3rd: 3000,
}

export type BroadcastResult = {
  ok: boolean
  contest: { id: string; title: string | null; season: number | null }
  phase: Phase
  eligible: number
  queued: number
  remaining: number
  sent: number
  failed: number
  dryRun: boolean
  sample?: string[]
  skipped?: 'no_email_key'
}

/** Phase implied by the schedule, so copy and dedupe bucket can't disagree. */
export function currentPhase(c: Contest): Phase {
  return daysUntilOpen(c.submissions_open_at) === 0 ? 'open' : 'teaser'
}

export function logKindFor(contestId: string, phase: Phase): string {
  const base = `contest_announce:${contestId}`
  return phase === 'teaser' ? base : `${base}:${phase}`
}

/**
 * Mail every registered user who hasn't had this phase yet.
 *
 * @param opts.dryRun  resolve the audience and return it without sending.
 * @param opts.onlyTo  send to a single address, bypassing enumeration and the
 *                     already-sent filter (used for test sends).
 */
export async function broadcastAnnouncement(opts: {
  contest: Contest
  phase?: Phase
  dryRun?: boolean
  onlyTo?: string
  fallbackUserId?: string | null
  maxPerRun?: number
}): Promise<BroadcastResult> {
  const { contest } = opts
  const phase = opts.phase ?? currentPhase(contest)
  const logKind = logKindFor(contest.id, phase)
  const cap = opts.maxPerRun ?? MAX_PER_RUN

  const audience = opts.onlyTo
    ? [await resolveOne(opts.onlyTo, opts.fallbackUserId ?? null)]
    : await eligibleUsers(logKind)

  const capped = audience.slice(0, cap)
  const result: BroadcastResult = {
    ok: true,
    contest: { id: contest.id, title: contest.title, season: contest.season_number },
    phase,
    eligible: audience.length,
    queued: capped.length,
    remaining: Math.max(0, audience.length - capped.length),
    sent: 0,
    failed: 0,
    dryRun: !!opts.dryRun,
  }

  if (opts.dryRun) {
    result.sample = capped.slice(0, 20).map((u) => u.email)
    return result
  }

  const resend = getResend()
  if (!resend) {
    console.warn(`[contestAnnounce:${phase}] RESEND_API_KEY not set — ${capped.length} not sent`)
    return { ...result, ok: false, skipped: 'no_email_key' }
  }

  for (let i = 0; i < capped.length; i += BATCH_SIZE) {
    const chunk = capped.slice(i, i + BATCH_SIZE)
    const messages = chunk.map((u) => {
      const { subject, html } = buildEmail(contest, { name: u.name, uid: u.id })
      return { from: FROM, to: u.email, subject, html }
    })

    try {
      const { error } = await resend.batch.send(messages)
      if (error) throw new Error(error.message)
      result.sent += chunk.length
      await logEmails(
        chunk.map((u, j) => ({
          kind: logKind, to_email: u.email, subject: messages[j].subject,
          creator_id: u.id, status: 'sent',
        })),
      )
    } catch (e: unknown) {
      // batch.send is all-or-nothing: one address Resend dislikes rejects the
      // whole call. Retry the chunk one message at a time so the rest still go.
      const msg = e instanceof Error ? e.message : 'batch send failed'
      console.error(`[contestAnnounce:${phase}] batch at ${i} failed, retrying singly:`, msg)

      for (let j = 0; j < messages.length; j++) {
        const m = messages[j]
        const u = chunk[j]
        try {
          const { error } = await resend.emails.send(m)
          if (error) throw new Error(error.message)
          result.sent++
          await logEmails([{
            kind: logKind, to_email: u.email, subject: m.subject,
            creator_id: u.id, status: 'sent',
          }])
        } catch (inner: unknown) {
          const why = inner instanceof Error ? inner.message : 'send failed'
          result.failed++
          await logEmails([{
            kind: logKind, to_email: u.email, subject: m.subject,
            creator_id: u.id, status: 'failed', error: why,
          }])
        }
      }
    }

    if (i + BATCH_SIZE < capped.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS))
    }
  }

  result.ok = result.sent > 0 || capped.length === 0
  return result
}

/**
 * "Entries are open" to everyone, fired when the season flips to open.
 * Best-effort: a mail failure must never break the transition that called it.
 */
export async function announceContestOpen(
  contestId: string,
  opts?: { maxPerRun?: number },
): Promise<BroadcastResult | null> {
  try {
    const contest = await contestById(contestId)
    if (!contest) return null
    return await broadcastAnnouncement({
      contest,
      phase: 'open',
      maxPerRun: opts?.maxPerRun,
    })
  } catch (e) {
    console.error('[contestAnnounce] announceContestOpen failed:', e)
    return null
  }
}

/**
 * Backstop for the open-phase mail, safe to call from a daily cron.
 *
 * The inline send during the open transition is capped and can only ever reach
 * the users who existed at that moment. This catches the remainder and anyone
 * who registered later in the window, and no-ops once everyone has had it.
 */
export async function announceOpenContestIfDue(): Promise<BroadcastResult | null> {
  try {
    const { data } = await admin
      .from('contests').select(CONTEST_COLS)
      .eq('status', 'open')
      .order('season_number', { ascending: false })
      .limit(1).maybeSingle()
    const contest = data as Contest | null
    if (!contest) return null

    // Only while submissions are genuinely open — never after they close.
    const now = Date.now()
    const opensAt = contest.submissions_open_at ? Date.parse(contest.submissions_open_at) : null
    const closesAt = contest.submissions_close_at ? Date.parse(contest.submissions_close_at) : null
    if (opensAt && now < opensAt) return null
    if (closesAt && now > closesAt) return null

    return await broadcastAnnouncement({ contest, phase: 'open' })
  } catch (e) {
    console.error('[contestAnnounce] announceOpenContestIfDue failed:', e)
    return null
  }
}

// ── Audience ──────────────────────────────────────────────────────────────

/**
 * Every registered user who should receive this phase: has a usable email,
 * hasn't opted out, and hasn't already been mailed for it.
 */
async function eligibleUsers(logKind: string) {
  const [meta, already] = await Promise.all([profileMeta(), alreadySent(logKind)])

  const out: { id: string | null; email: string; name: string }[] = []
  const seen = new Set<string>()

  // listUsers is paginated — walk until a short page comes back.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const users = data?.users ?? []
    if (!users.length) break

    for (const u of users) {
      const email = u.email?.trim()
      if (!email || !EMAIL_OK.test(email)) continue
      const key = email.toLowerCase()
      if (seen.has(key) || already.has(key)) continue
      const m = meta.get(u.id)
      if (m?.optedOut) continue
      seen.add(key)
      out.push({ id: u.id, email, name: m?.name || 'there' })
    }

    if (users.length < 1000) break
  }

  return out
}

/** Look up a single address among registered users so a test send is realistic. */
async function resolveOne(
  email: string,
  fallbackId: string | null,
): Promise<{ id: string | null; email: string; name: string }> {
  const target = email.toLowerCase()
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    const users = data?.users ?? []
    if (!users.length) break
    const hit = users.find((u) => u.email?.toLowerCase() === target)
    if (hit) {
      const { data: prof } = await admin
        .from('profiles').select('name').eq('id', hit.id).maybeSingle()
      return { id: hit.id, email, name: (prof as { name?: string } | null)?.name || 'there' }
    }
    if (users.length < 1000) break
  }
  return { id: fallbackId, email, name: 'there' }
}

async function profileMeta(): Promise<Map<string, { name: string | null; optedOut: boolean }>> {
  const map = new Map<string, { name: string | null; optedOut: boolean }>()
  try {
    // Paged so a large profiles table isn't truncated by the default row cap.
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, name, email_opt_in')
        .range(from, from + PAGE - 1)
      if (error || !data?.length) break
      for (const p of data as { id: string; name: string | null; email_opt_in: boolean | null }[]) {
        map.set(p.id, { name: p.name, optedOut: p.email_opt_in === false })
      }
      if (data.length < PAGE) break
    }
  } catch {
    // No profiles data → nobody is treated as opted out.
  }
  return map
}

async function alreadySent(logKind: string): Promise<Set<string>> {
  const set = new Set<string>()
  try {
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('email_logs')
        .select('to_email')
        .eq('kind', logKind)
        .eq('status', 'sent')
        .range(from, from + PAGE - 1)
      if (error || !data?.length) break
      for (const r of data as { to_email: string }[]) set.add(r.to_email.toLowerCase())
      if (data.length < PAGE) break
    }
  } catch {
    // Missing log table must not block the announcement.
  }
  return set
}

async function logEmails(
  rows: {
    kind: string; to_email: string; subject: string
    creator_id?: string | null; status: string; error?: string
  }[],
) {
  try { await admin.from('email_logs').insert(rows) } catch {}
}

// ── Contest lookup ────────────────────────────────────────────────────────

const CONTEST_COLS =
  'id, title, season_number, entry_fee, prize_1st, prize_2nd, prize_3rd, submissions_open_at, submissions_close_at, voting_close_at'

export async function liveContest(): Promise<Contest | null> {
  const { data: open } = await admin
    .from('contests').select(CONTEST_COLS)
    .in('status', ['open', 'voting'])
    .order('season_number', { ascending: false })
    .limit(1).maybeSingle()
  if (open) return open as Contest

  const { data: upcoming } = await admin
    .from('contests').select(CONTEST_COLS)
    .eq('status', 'upcoming')
    .order('submissions_open_at', { ascending: true })
    .limit(1).maybeSingle()
  return (upcoming as Contest) ?? null
}

export async function contestById(id: string): Promise<Contest | null> {
  const { data } = await admin.from('contests').select(CONTEST_COLS).eq('id', id).maybeSingle()
  return (data as Contest) ?? null
}

// ── Template ──────────────────────────────────────────────────────────────

function rupees(n: number | null | undefined, fallback: number): string {
  return `₹${(n ?? fallback).toLocaleString('en-IN')}`
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

function plusMinute(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t + 60_000).toISOString()
}

function window_(a: string | null, b: string | null): string | null {
  const from = fmtDate(a)
  const to = fmtDate(b)
  if (from && to) return `${from} – ${to}`
  return from ?? to
}

/** Days until submissions open. 0 = already open (or no date on the row). */
function daysUntilOpen(iso: string | null): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000))
}

export function buildEmail(c: Contest, ctx: { name: string; uid: string | null }) {
  const rawTitle = c.title?.trim() || 'Telugu Short Film Contest'
  const seasonLabel = c.season_number ? `Season ${c.season_number}` : 'Season 1'
  // The stored title often already ends in "— Season 1"; strip it so sentences
  // that add the season back don't read "Season 1 of the ... — Season 1".
  const title = rawTitle.replace(/\s*[—–\-·|]\s*season\s*\d+\s*$/i, '').trim() || rawTitle
  const contestUrl = `${SITE}/contest`
  // /upload is the FREE publish form and cannot enter anyone — the paid entry
  // (fee, authorship declaration, one-per-account) only exists at /contest/enter.
  const enterUrl = `${SITE}/contest/enter`
  const unsubscribe = ctx.uid
    ? `${SITE}/api/email/unsubscribe?uid=${encodeURIComponent(ctx.uid)}`
    : `${SITE}/profile`

  const submissions = window_(c.submissions_open_at, c.submissions_close_at)
  // Voting opens the moment submissions close (23:59 on the last day), so nudge
  // past the boundary to print the day voting actually starts.
  const voting = window_(plusMinute(c.submissions_close_at), c.voting_close_at)
  const opensOn = fmtDate(c.submissions_open_at)
  const closesOn = fmtDate(c.submissions_close_at)

  const days = daysUntilOpen(c.submissions_open_at)
  const countdown =
    days === 0 ? 'Entries are open' : days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`

  const pool =
    (c.prize_1st ?? FALLBACK.prize_1st) +
    (c.prize_2nd ?? FALLBACK.prize_2nd) +
    (c.prize_3rd ?? FALLBACK.prize_3rd)

  const subject =
    days === 0
      ? `\u{1F3AC} Entries are open — ${title}, ${seasonLabel}`
      : days === 1
        ? `\u{1F3AC} It starts tomorrow — are you ready?`
        : `\u{1F3AC} ${days} days to go — ${title}, ${seasonLabel}`

  const heading = days === 0 ? 'Entries are open \u{1F3AC}' : 'Are you ready? \u{1F3AC}'

  const intro =
    days === 0
      ? `${seasonLabel} of the ${title} is live — entries are open${closesOn ? ` until ${closesOn}` : ''}. Any Telugu short film you've worked on counts, new or old, so you don't need to shoot anything for it.`
      : `${seasonLabel} of the ${title} ${days === 1 ? 'opens tomorrow' : `opens on ${opensOn}`} — and you don't need to shoot anything new. Any Telugu short film you've worked on counts, however old it is.`

  const rows: [string, string][] = [
    ['Prize pool', `${rupees(pool, 19999)} — ${rupees(c.prize_1st, FALLBACK.prize_1st)} / ${rupees(c.prize_2nd, FALLBACK.prize_2nd)} / ${rupees(c.prize_3rd, FALLBACK.prize_3rd)}`],
    ['Entry fee', `${rupees(c.entry_fee, FALLBACK.entry_fee)} per film`],
    ...(submissions ? ([['Submissions', submissions]] as [string, string][]) : []),
    ...(voting ? ([['Voting', voting]] as [string, string][]) : []),
    ['Who can enter', 'Any registered user, any district'],
  ]

  const rowsHtml = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 14px 8px 0;color:#7A6040;font-size:13px;vertical-align:top;width:104px;">${esc(k)}</td>
        <td style="padding:8px 0;color:#FDF6E3;font-size:14px;font-weight:600;">${esc(v)}</td>
      </tr>`,
    )
    .join('')

  const steps: [string, string][] = [
    ['1', 'Enter any Telugu short film you helped make — new or old, hosted on YouTube.'],
    ['2', 'Share it. Every vote comes from a registered user, so bring your audience.'],
    ['3', 'Top 5 are reviewed for eligibility, then the three winners are announced.'],
  ]

  const stepsHtml = steps
    .map(
      ([n, text]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#D4A017;font-size:14px;font-weight:800;vertical-align:top;width:18px;">${n}</td>
        <td style="padding:6px 0;color:#E7DCC5;font-size:14px;line-height:1.55;">${esc(text)}</td>
      </tr>`,
    )
    .join('')

  const html = `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:14px;">
    <div style="color:#D4A017;font-weight:800;letter-spacing:1px;font-size:14px;">CINEMAVURU</div>
    <div style="display:inline-block;background:#1A1208;border:1px solid #FF6B1A;color:#FF6B1A;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border-radius:999px;margin:16px 0 10px;">
      ${esc(countdown)}
    </div>
    <h1 style="color:#fff;font-size:26px;margin:4px 0 6px;">${heading}</h1>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 8px;">Hi ${esc(ctx.name)},</p>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 20px;">${esc(intro)}</p>

    <a href="${contestUrl}" style="display:block;margin:0 0 22px;">
      <img src="${POSTER_URL}" alt="${esc(title)} — ${esc(seasonLabel)}" width="456"
        style="display:block;width:100%;max-width:456px;height:auto;border:1px solid #2E2010;border-radius:12px;" />
    </a>

    <table style="width:100%;border-collapse:collapse;background:#1A1208;border:1px solid #2E2010;border-radius:10px;margin-bottom:22px;">
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="color:#7A6040;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">How it works</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tbody>${stepsHtml}</tbody></table>

    <a href="${days === 0 ? enterUrl : contestUrl}" style="display:block;text-align:center;background:linear-gradient(90deg,#FF6B1A,#D4A017);color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin-bottom:10px;">
      ${days === 0 ? `\u{1F3A5} Enter your film — ${rupees(c.entry_fee, FALLBACK.entry_fee)}` : '\u{1F3A5} See the contest &amp; get ready'}
    </a>
    <a href="${contestUrl}" style="display:block;text-align:center;border:1px solid #2E2010;color:#FDF6E3;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;">
      Read the full rules →
    </a>

    <p style="color:#7A6040;font-size:12px;line-height:1.6;margin:22px 0 0;">
      One entry per account per season. Entries are approved by an admin before they go live, usually
      within 24 hours. Every registered user gets one vote for the whole season, and you can change it
      until voting closes. Questions? <a href="mailto:cinemavuruconnects@gmail.com" style="color:#D4A017;">cinemavuruconnects@gmail.com</a>
    </p>

    <p style="color:#4A3020;font-size:11px;margin-top:24px;line-height:1.5;">
      CinemaVuru — the cinema of your district.<br/>
      <a href="${unsubscribe}" style="color:#4A3020;">Unsubscribe from CinemaVuru emails</a>
    </p>
  </div>`

  return { subject, html }
}
