// GET/POST /api/cron/milestones
// Scans active films, detects newly-crossed milestones + live rank, and emails
// creators a single, promotion-focused nudge each (achievement > rank-close >
// boost). Non-repetitive via film_notify_state + a baseline pass + a per-film
// frequency cap. Runs on a Vercel Cron schedule (see vercel.json); can be
// triggered manually for testing with ?secret=CRON_SECRET.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { VIEW_MILESTONES, LIKE_MILESTONES, highestReached, nextMilestone, almostNext, fmt } from '@/lib/milestones'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
// Lazy so the route still loads/tests locally when RESEND_API_KEY is absent.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}
const FROM = process.env.FROM_EMAIL ?? 'CinemaVuru <noreply@cinemavuru.com>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

const MAX_EMAILS_PER_RUN = 40
const FREQ_CAP_MS = 20 * 60 * 60 * 1000   // ≤ 1 email per film per ~20h

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // unset (e.g. local dev) → allow manual runs
  const auth = req.headers.get('authorization')
  const q = new URL(req.url).searchParams.get('secret')
  return auth === `Bearer ${secret}` || q === secret
}

function loc(f: any) {
  const d = Array.isArray(f?.districts) ? f.districts[0] : f?.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  return { state: s?.slug ?? 'telangana', district: d?.slug ?? 'hyderabad', districtName: d?.name_en ?? '' }
}

type Decision =
  | { kind: 'achv'; metric: 'views' | 'likes'; milestone: number; next: number | null }
  | { kind: 'rank'; rank: number; gap: number; aboveTitle: string }
  | { kind: 'boost'; metric: 'views' | 'likes'; target: number; remaining: number }

export async function GET(req: Request) { return run(req) }
export async function POST(req: Request) { return run(req) }

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: films, error } = await admin
    .from('films')
    .select('id, title_en, view_count, like_count, creator_id, districts(name_en, slug, states(slug))')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: 'Run MILESTONE_EMAILS_SETUP.sql first (film_notify_state / email_opt_in).' },
      { status: 500 },
    )
  }
  if (!films?.length) return NextResponse.json({ ok: true, sent: 0, note: 'no active films' })

  // Live rank by views (overall trending).
  const ranked = [...films].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
  const rankOf = new Map<string, number>()
  ranked.forEach((f, i) => rankOf.set(f.id, i + 1))

  const ids = films.map((f) => f.id)
  const { data: states, error: stErr } = await admin.from('film_notify_state').select('*').in('film_id', ids)
  if (stErr) {
    return NextResponse.json(
      { error: stErr.message, hint: 'Run MILESTONE_EMAILS_SETUP.sql first.' },
      { status: 500 },
    )
  }
  const stateMap = new Map((states ?? []).map((s: any) => [s.film_id, s]))

  const now = Date.now()
  const baseline: any[] = []
  const candidates: { f: any; vHigh: number; lHigh: number; rank: number; decision: Decision }[] = []

  for (const f of films) {
    const views = f.view_count ?? 0
    const likes = f.like_count ?? 0
    const vHigh = highestReached(views, VIEW_MILESTONES)
    const lHigh = highestReached(likes, LIKE_MILESTONES)
    const rank = rankOf.get(f.id) ?? 0
    const st = stateMap.get(f.id)

    // First time we see a film → record a baseline, don't email its existing counts.
    if (!st) {
      baseline.push({ film_id: f.id, last_view_milestone: vHigh, last_like_milestone: lHigh, last_rank: rank })
      continue
    }
    // Frequency cap.
    if (st.last_sent_at && now - new Date(st.last_sent_at).getTime() < FREQ_CAP_MS) continue

    let decision: Decision | null = null

    if (vHigh > (st.last_view_milestone ?? 0)) {
      decision = { kind: 'achv', metric: 'views', milestone: vHigh, next: nextMilestone(views, VIEW_MILESTONES) }
    } else if (lHigh > (st.last_like_milestone ?? 0)) {
      decision = { kind: 'achv', metric: 'likes', milestone: lHigh, next: nextMilestone(likes, LIKE_MILESTONES) }
    } else if (rank >= 2 && rank <= 5) {
      const above = ranked[rank - 2]
      const gap = (above.view_count ?? 0) - views
      const closeEnough = gap > 0 && gap <= Math.max(25, Math.ceil((above.view_count ?? 0) * 0.05))
      if (closeEnough && st.last_rank !== rank) {
        decision = { kind: 'rank', rank, gap, aboveTitle: above.title_en }
      }
    }
    if (!decision) {
      const av = almostNext(views, VIEW_MILESTONES)
      const al = av ? null : almostNext(likes, LIKE_MILESTONES)
      const boost = av ?? al
      const metric: 'views' | 'likes' = av ? 'views' : 'likes'
      if (boost && st.last_boost_target !== boost.target) {
        decision = { kind: 'boost', metric, target: boost.target, remaining: boost.remaining }
      }
    }

    if (decision) candidates.push({ f, vHigh, lHigh, rank, decision })
  }

  if (baseline.length) {
    await admin.from('film_notify_state').upsert(baseline, { onConflict: 'film_id' })
  }

  const results = { baselined: baseline.length, candidates: candidates.length, sent: 0, skipped: 0, dryRun: false as boolean }
  const resend = getResend()
  if (!resend) {
    // No email key locally — report what WOULD be sent without sending.
    results.dryRun = true
    return NextResponse.json({ ok: true, ...results, note: 'RESEND_API_KEY not set — dry run (no emails sent).' })
  }
  const batch = candidates.slice(0, MAX_EMAILS_PER_RUN)

  for (const { f, vHigh, lHigh, rank, decision } of batch) {
    // Respect opt-out + fetch the creator's email.
    const { data: prof } = await admin.from('profiles').select('name, email_opt_in').eq('id', f.creator_id).maybeSingle()
    if (prof && (prof as any).email_opt_in === false) { results.skipped++; continue }
    const { data: u } = await admin.auth.admin.getUserById(f.creator_id)
    const email = u?.user?.email
    if (!email) { results.skipped++; continue }

    const l = loc(f)
    const filmUrl = `${SITE}/${l.state}/${l.district}/film/${f.id}`
    const { subject, html } = buildEmail(decision, {
      title: f.title_en,
      name: (prof as any)?.name ?? 'there',
      views: f.view_count ?? 0,
      likes: f.like_count ?? 0,
      filmUrl,
      uid: f.creator_id,
    })

    try {
      await resend.emails.send({ from: FROM, to: email, subject, html })
      results.sent++
      await admin.from('film_notify_state').upsert(
        {
          film_id: f.id,
          last_view_milestone: vHigh,
          last_like_milestone: lHigh,
          last_rank: rank,
          last_boost_target: decision.kind === 'boost' ? decision.target : (stateMap.get(f.id)?.last_boost_target ?? null),
          last_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'film_id' },
      )
    } catch {
      results.skipped++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}

// ── Email templates (brand-styled, promotion-focused) ────────────────────
function buildEmail(
  d: Decision,
  ctx: { title: string; name: string; views: number; likes: number; filmUrl: string; uid: string },
) {
  const shareText = encodeURIComponent(`Watch & support my short film on CinemaVuru 🎬 ${ctx.filmUrl}`)
  const whatsapp = `https://wa.me/?text=${shareText}`
  const unsubscribe = `${SITE}/api/email/unsubscribe?uid=${ctx.uid}`

  let heading = ''
  let sub = ''
  let subject = ''

  if (d.kind === 'achv') {
    const m = d.metric === 'views' ? 'views' : 'likes'
    subject = `🎉 "${ctx.title}" just hit ${fmt(d.milestone)} ${m}!`
    heading = `${fmt(d.milestone)} ${m} 🎉`
    sub = d.next
      ? `Momentum is building. Just <b>${fmt(d.next - (d.metric === 'views' ? ctx.views : ctx.likes))} more ${m}</b> to reach ${fmt(d.next)} — share it now to get there faster.`
      : `Incredible reach! Keep sharing to climb even higher.`
  } else if (d.kind === 'rank') {
    subject = `🔥 You're #${d.rank} — only ${d.gap} views from #${d.rank - 1}!`
    heading = `You're #${d.rank} on CinemaVuru 🔥`
    sub = `"${ctx.title}" is just <b>${d.gap} views</b> behind <i>${d.aboveTitle}</i>. A few shares could take the higher spot — every view counts.`
  } else {
    const m = d.metric === 'views' ? 'views' : 'likes'
    subject = `🚀 ${d.remaining} ${m} away from ${fmt(d.target)}!`
    heading = `Almost at ${fmt(d.target)} ${m} 🚀`
    sub = `"${ctx.title}" is only <b>${d.remaining} ${m}</b> from ${fmt(d.target)}. Give it a boost — share the link with your circle and cross the line today.`
  }

  const html = `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:14px;">
    <div style="color:#D4A017;font-weight:800;letter-spacing:1px;font-size:14px;">CINEMAVURU</div>
    <h1 style="color:#fff;font-size:26px;margin:14px 0 6px;">${heading}</h1>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 8px;">Hi ${ctx.name},</p>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 20px;">${sub}</p>

    <div style="background:#1A1208;border:1px solid #2E2010;border-radius:10px;padding:14px 16px;margin-bottom:22px;">
      <span style="color:#7A6040;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Now at</span>
      <div style="color:#FFC845;font-weight:800;font-size:18px;margin-top:4px;">👁 ${fmt(ctx.views)} views &nbsp;·&nbsp; ❤️ ${fmt(ctx.likes)} likes</div>
    </div>

    <a href="${whatsapp}" style="display:block;text-align:center;background:linear-gradient(90deg,#FF6B1A,#D4A017);color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin-bottom:10px;">
      📣 Share on WhatsApp — get more views
    </a>
    <a href="${ctx.filmUrl}" style="display:block;text-align:center;border:1px solid #2E2010;color:#FDF6E3;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;">
      View your film →
    </a>

    <p style="color:#4A3020;font-size:11px;margin-top:28px;line-height:1.5;">
      CinemaVuru — the cinema of your district.<br/>
      <a href="${unsubscribe}" style="color:#4A3020;">Unsubscribe from milestone emails</a>
    </p>
  </div>`

  return { subject, html }
}
