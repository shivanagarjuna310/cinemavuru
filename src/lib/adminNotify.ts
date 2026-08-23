// src/lib/adminNotify.ts
// SERVER-ONLY. Sends "an admin needs to look at this" emails to EVERY admin.
//
// Recipients = every profile with role = 'admin' (email resolved from Supabase
// auth) + ADMIN_EMAIL / ADMIN_EMAILS from the environment. Adding a new admin
// in the DB is therefore enough — no env change, no redeploy.
//
// Usage (route handlers / crons only — never from a client component):
//   import { notifyAdmins } from '@/lib/adminNotify'
//   await notifyAdmins({
//     kind: 'film_pending',
//     subject: 'New film awaiting review — Aakasham',
//     heading: 'New film submitted',
//     intro: 'A creator just submitted a film. It stays hidden until approved.',
//     rows: [['Film', 'Aakasham'], ['Creator', 'Ravi']],
//     ctaLabel: 'Review in Admin',
//   })

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// Lazy so routes still load/test locally when RESEND_API_KEY is absent.
function getResend(): Resend | null {
  const k = process.env.RESEND_API_KEY
  return k ? new Resend(k) : null
}

// `||` not `??` — an env var set to an empty string must fall back too.
const FROM = process.env.FROM_EMAIL?.trim() || 'CinemaVuru <noreply@cinemavuru.com>'
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'
export const ADMIN_PATH = '/cv-admin-1a25'

// ── Recipients ────────────────────────────────────────────────────────────

// Resolving recipients costs one profiles query + one auth lookup per admin.
// Cache it briefly so a burst of alerts doesn't repeat that work — this matters
// on the Supabase/Vercel free tiers. A warm serverless instance reuses it; a
// cold one just pays for it once.
const RECIPIENT_TTL_MS = 5 * 60_000
let recipientCache: { at: number; list: string[] } | null = null

/**
 * Every address that should hear about admin-level events.
 * DB admins first (role = 'admin' in profiles), then the env fallbacks so a
 * fresh install with no admin rows still reaches someone.
 *
 * @param opts.fresh skip the cache (the admin panel uses this so it always
 *                   shows the true current list).
 */
export async function getAdminRecipients(opts?: { fresh?: boolean }): Promise<string[]> {
  if (!opts?.fresh && recipientCache && Date.now() - recipientCache.at < RECIPIENT_TTL_MS) {
    return recipientCache.list
  }

  const out: string[] = []

  // 1. Everyone with role = 'admin'.
  try {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    for (const a of admins ?? []) {
      const { data } = await admin.auth.admin.getUserById((a as { id: string }).id)
      const email = data?.user?.email
      if (email) out.push(email)
    }
  } catch {
    // A broken profiles query must not silence the env fallbacks below.
  }

  // 2. Env fallbacks — ADMIN_EMAILS is a comma-separated list.
  const envList = [process.env.ADMIN_EMAILS ?? '', process.env.ADMIN_EMAIL ?? '']
    .join(',')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  out.push(...envList)

  // Dedupe case-insensitively, keeping the first spelling seen.
  const seen = new Set<string>()
  const list = out.filter((e) => {
    const k = e.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // Never cache an empty list — that would keep a transient failure sticky and
  // silence alerts for the whole TTL.
  if (list.length) recipientCache = { at: Date.now(), list }
  return list
}

// ── Send ──────────────────────────────────────────────────────────────────

export type AdminNotice = {
  /** Short machine name — stored in email_logs as `admin:<kind>`. */
  kind: string
  subject: string
  heading: string
  /** Intro paragraph. Pass pre-escaped/safe HTML. */
  intro?: string
  /** Label/value pairs rendered as a table. Values are HTML-escaped. */
  rows?: [string, string][]
  /** Extra HTML appended under the table (already-safe markup only). */
  bodyHtml?: string
  ctaLabel?: string
  /** Path on the site, e.g. '/cv-admin-1a25'. Defaults to the admin panel. */
  ctaPath?: string
  /** Accent colour for the heading. */
  tone?: 'info' | 'good' | 'warn' | 'danger'
  film_id?: string | null
  creator_id?: string | null
  /**
   * Skip the send if the same `kind` already went out this many minutes ago.
   * Guards abuse-triggered alerts (e.g. payment signature failures) from
   * flooding inboxes.
   */
  throttleMinutes?: number
}

export type NotifyResult = {
  ok: boolean
  sent: number
  failed: number
  recipients: number
  skipped?: 'throttled' | 'no_recipients' | 'no_email_key'
}

export async function notifyAdmins(n: AdminNotice): Promise<NotifyResult> {
  const logKind = `admin:${n.kind}`

  if (n.throttleMinutes && (await recentlySent(logKind, n.throttleMinutes))) {
    return { ok: true, sent: 0, failed: 0, recipients: 0, skipped: 'throttled' }
  }

  const recipients = await getAdminRecipients()
  if (!recipients.length) {
    console.error(
      `[adminNotify:${n.kind}] no admin recipients — set ADMIN_EMAIL or give a profile role='admin'`,
    )
    return { ok: false, sent: 0, failed: 0, recipients: 0, skipped: 'no_recipients' }
  }

  const resend = getResend()
  if (!resend) {
    console.warn(
      `[adminNotify:${n.kind}] RESEND_API_KEY not set — would have emailed ${recipients.length} admin(s)`,
    )
    return { ok: false, sent: 0, failed: 0, recipients: recipients.length, skipped: 'no_email_key' }
  }

  const html = shell(n)
  let sent = 0
  let failed = 0

  // One send per admin so a single bad address can't drop the whole batch, and
  // so email_logs shows per-admin delivery.
  await Promise.all(
    recipients.map(async (to) => {
      try {
        const { error } = await resend.emails.send({ from: FROM, to, subject: n.subject, html })
        if (error) throw new Error(error.message)
        sent++
        await logEmail({
          kind: logKind, to_email: to, subject: n.subject,
          film_id: n.film_id, creator_id: n.creator_id, status: 'sent',
        })
      } catch (e: unknown) {
        failed++
        const msg = e instanceof Error ? e.message : 'send failed'
        console.error(`[adminNotify:${n.kind}] send to ${to} failed:`, msg)
        await logEmail({
          kind: logKind, to_email: to, subject: n.subject,
          film_id: n.film_id, creator_id: n.creator_id, status: 'failed', error: msg,
        })
      }
    }),
  )

  return { ok: sent > 0, sent, failed, recipients: recipients.length }
}

async function recentlySent(logKind: string, minutes: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - minutes * 60_000).toISOString()
    const { count } = await admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('kind', logKind)
      .eq('status', 'sent')
      .gte('created_at', since)
    return (count ?? 0) > 0
  } catch {
    return false // never block a real alert because the log table is missing
  }
}

async function logEmail(row: {
  kind: string; to_email: string; subject: string
  film_id?: string | null; creator_id?: string | null; status: string; error?: string
}) {
  try { await admin.from('email_logs').insert(row) } catch {}
}

// ── Once-only claims ──────────────────────────────────────────────────────
// A film upload can be announced twice: once by the uploader's browser and
// once by the Supabase INSERT webhook. Whoever wins the race claims the key
// atomically (primary-key conflict) and the loser stays quiet.

/** True if this caller won the right to send. Fails OPEN if the table is absent. */
async function claimOnce(key: string): Promise<boolean> {
  try {
    const { error } = await admin.from('admin_notify_claims').insert({ key })
    if (!error) return true
    // 23505 = unique violation → somebody already claimed it.
    if ((error as { code?: string }).code === '23505') return false
    // Any other error (missing table, RLS, offline) → do not lose the alert.
    console.warn('[adminNotify] claim check unavailable, sending anyway:', error.message)
    return true
  } catch {
    return true
  }
}

/** Give the claim back so a later attempt can retry (used when a send fails). */
async function releaseClaim(key: string): Promise<void> {
  try { await admin.from('admin_notify_claims').delete().eq('key', key) } catch {}
}

// ── Prebuilt notices ──────────────────────────────────────────────────────

export type FilmPendingResult = NotifyResult & { reason?: 'duplicate' | 'not_found' | 'not_pending' }

/**
 * "A film is waiting for review" — the alert every admin gets the moment an
 * upload lands. Details are read from the DB, so callers only pass an id.
 * Safe to call from both the browser trigger and the DB webhook: only the
 * first one for a given film actually sends.
 */
export async function notifyFilmPending(filmId: string): Promise<FilmPendingResult> {
  const { data: film } = await admin
    .from('films')
    .select('id, title_en, title_te, genre, video_url, status, creator_id, districts(name_en)')
    .eq('id', filmId)
    .maybeSingle()

  if (!film) return { ok: false, sent: 0, failed: 0, recipients: 0, reason: 'not_found' }
  if (film.status !== 'pending') {
    return { ok: false, sent: 0, failed: 0, recipients: 0, reason: 'not_pending' }
  }

  const key = `film_pending:${film.id}`
  if (!(await claimOnce(key))) {
    return { ok: true, sent: 0, failed: 0, recipients: 0, reason: 'duplicate' }
  }

  const { data: creatorProfile } = await admin
    .from('profiles').select('name').eq('id', film.creator_id).maybeSingle()
  const { data: creatorUser } = await admin.auth.admin.getUserById(film.creator_id)

  const d = Array.isArray(film.districts) ? film.districts[0] : film.districts
  const districtName = (d as { name_en?: string } | null)?.name_en ?? '—'
  const watchUrl = (film.video_url ?? '').replace('/embed/', '/watch?v=')

  const result = await notifyAdmins({
    kind: 'film_pending',
    tone: 'info',
    subject: `New film awaiting review — ${film.title_en}`,
    heading: 'New film submitted',
    intro:
      'A creator just submitted a film. It stays hidden from the site until an admin approves it.',
    rows: [
      ['Film', film.title_en],
      ...(film.title_te ? ([['Telugu', film.title_te]] as [string, string][]) : []),
      ['Genre', film.genre ?? '—'],
      ['District', districtName],
      ['Creator', (creatorProfile as { name?: string } | null)?.name ?? 'Unknown'],
      ['Email', creatorUser?.user?.email ?? '—'],
    ],
    bodyHtml: watchUrl
      ? `<p style="margin:0 0 18px;"><a href="${watchUrl}" style="color:#FFC845;font-size:14px;">Watch the submission on YouTube &rarr;</a></p>`
      : undefined,
    ctaLabel: 'Review in Admin',
    ctaPath: ADMIN_PATH,
    film_id: film.id,
    creator_id: film.creator_id,
  })

  // Nothing went out — hand the claim back so the digest/webhook can retry.
  if (result.sent === 0) await releaseClaim(key)

  return result
}

/**
 * Contest entry fee landed. Best-effort: a failed email must never fail the
 * payment response, so this never throws.
 */
export async function notifyPaidEntry(p: {
  filmId?: string
  userId?: string
  contestId?: string
  gateway: string
  reference?: string
  amount?: number
}): Promise<void> {
  try {
    const [film, profile, contest] = await Promise.all([
      p.filmId
        ? admin.from('films').select('title_en').eq('id', p.filmId).maybeSingle()
        : Promise.resolve({ data: null }),
      p.userId
        ? admin.from('profiles').select('name').eq('id', p.userId).maybeSingle()
        : Promise.resolve({ data: null }),
      p.contestId
        ? admin.from('contests').select('title, entry_fee').eq('id', p.contestId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const fee = p.amount ?? (contest.data as { entry_fee?: number } | null)?.entry_fee
    await notifyAdmins({
      kind: 'contest_entry_paid',
      tone: 'good',
      subject: `Contest entry fee received${fee != null ? ` — Rs.${fee}` : ''}`,
      heading: 'Contest entry paid',
      intro: 'A creator completed their contest entry payment. The entry is now confirmed.',
      rows: [
        ['Amount', fee != null ? `Rs.${fee}` : '—'],
        ['Film', (film.data as { title_en?: string } | null)?.title_en ?? '—'],
        ['Creator', (profile.data as { name?: string } | null)?.name ?? '—'],
        ['Contest', (contest.data as { title?: string } | null)?.title ?? '—'],
        ['Gateway', p.gateway],
        ['Reference', p.reference ?? '—'],
      ],
      ctaLabel: 'Open contest entries',
      film_id: p.filmId ?? null,
      creator_id: p.userId ?? null,
    })
  } catch (e) {
    console.error('notifyPaidEntry failed:', e)
  }
}

// ── Template ──────────────────────────────────────────────────────────────

const TONE = {
  info:   '#D4A017',
  good:   '#22c55e',
  warn:   '#FF6B1A',
  danger: '#ef4444',
}

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shell(n: AdminNotice): string {
  const accent = TONE[n.tone ?? 'info']
  const cta = `${SITE}${n.ctaPath ?? ADMIN_PATH}`
  const rows = (n.rows ?? [])
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:7px 14px 7px 0;color:#7A6040;font-size:13px;vertical-align:top;width:110px;">${esc(k)}</td>
        <td style="padding:7px 0;color:#FDF6E3;font-size:14px;font-weight:600;">${esc(v)}</td>
      </tr>`,
    )
    .join('')

  return `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:14px;">
    <div style="color:#D4A017;font-weight:800;letter-spacing:1px;font-size:13px;">CINEMAVURU &middot; ADMIN</div>
    <h1 style="color:${accent};font-size:23px;margin:14px 0 8px;">${esc(n.heading)}</h1>
    ${n.intro ? `<p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 18px;">${n.intro}</p>` : ''}
    ${rows ? `<table style="width:100%;border-collapse:collapse;background:#1A1208;border:1px solid #2E2010;border-radius:10px;margin-bottom:20px;"><tbody>${rows}</tbody></table>` : ''}
    ${n.bodyHtml ?? ''}
    <a href="${cta}" style="display:block;text-align:center;background:linear-gradient(90deg,#FF6B1A,#D4A017);color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin-top:6px;">
      ${esc(n.ctaLabel ?? 'Open Admin Panel')} &rarr;
    </a>
    <p style="color:#4A3020;font-size:11px;margin-top:28px;line-height:1.5;">
      You are receiving this because you are a CinemaVuru admin.<br/>
      Admin alerts go to every account with the admin role.
    </p>
  </div>`
}
