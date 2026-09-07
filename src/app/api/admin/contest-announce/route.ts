// POST /api/admin/contest-announce   — broadcast the contest announcement
// GET  /api/admin/contest-announce?secret=CRON_SECRET  — render the email
//
// The send itself lives in @/lib/contestAnnounce, which autoAdvanceContest()
// also calls when the season opens. This route is the manual/dry-run door.
//
// Safety: a plain POST is a DRY RUN. It reports exactly who would be mailed and
// sends nothing. Real delivery requires { "confirm": "SEND" } in the body.
//
//   Dry run:  curl -XPOST .../api/admin/contest-announce -H "authorization: Bearer <admin-token>"
//   For real: ... -d '{"confirm":"SEND"}'
//   Test one: ... -d '{"to":"me@example.com","confirm":"SEND"}'
//   A phase can be forced with {"phase":"teaser"|"open"}; it otherwise follows
//   the schedule.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  broadcastAnnouncement, buildEmail, contestById, liveContest, type Phase,
} from '@/lib/contestAnnounce'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const q = new URL(req.url).searchParams.get('secret')
  if (secret && q !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const contest = await liveContest()
  if (!contest) return NextResponse.json({ error: 'No open/upcoming contest found.' }, { status: 404 })

  const { html } = buildEmail(contest, { name: 'there', uid: null })
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
}

type Auth =
  | { ok: true; userId: string | null }
  | { ok: false; status: number; error: string }

/**
 * Either a signed-in admin's access token, or CRON_SECRET. Unlike the cron
 * routes there is deliberately no "secret unset → allow" fallback: this
 * endpoint mails every registered user, so a missing secret must not open it.
 */
async function authorize(req: Request): Promise<Auth> {
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const secret = process.env.CRON_SECRET
  if (secret) {
    const q = new URL(req.url).searchParams.get('secret')
    if (q === secret || bearer === secret) return { ok: true, userId: null }
  }

  if (!bearer) return { ok: false, status: 401, error: 'Not signed in.' }
  const { data: { user }, error } = await admin.auth.getUser(bearer)
  if (error || !user) return { ok: false, status: 401, error: 'Invalid session.' }
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((prof as { role?: string } | null)?.role !== 'admin') {
    return { ok: false, status: 403, error: 'Admins only.' }
  }
  return { ok: true, userId: user.id }
}

export async function POST(req: Request) {
  const auth = await authorize(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const live = body?.confirm === 'SEND'
  const onlyTo: string | undefined =
    typeof body?.to === 'string' && body.to.trim() ? body.to.trim() : undefined
  const phase: Phase | undefined =
    body?.phase === 'teaser' || body?.phase === 'open' ? body.phase : undefined

  const contest = body?.contestId
    ? await contestById(body.contestId as string)
    : await liveContest()
  if (!contest) {
    return NextResponse.json(
      { error: 'No open/upcoming contest found. Pass { contestId } explicitly.' },
      { status: 404 },
    )
  }

  const result = await broadcastAnnouncement({
    contest,
    phase,
    onlyTo,
    dryRun: !live,
    fallbackUserId: auth.userId,
  })

  if (result.skipped === 'no_email_key') {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not set on the server.' },
      { status: 503 },
    )
  }

  return NextResponse.json({
    ...result,
    ...(result.dryRun
      ? { note: 'DRY RUN — nothing sent. Re-POST with {"confirm":"SEND"} to deliver.' }
      : {}),
  })
}
