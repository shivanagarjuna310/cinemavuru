// POST /api/webhooks/film-created
//
// Supabase Database Webhook target: fires on INSERT INTO public.films and
// emails every admin that a film is waiting for review. Because Postgres calls
// this, the alert no longer depends on the uploader's browser staying open —
// a closed tab or dropped connection can't lose it.
//
// Setup: see ADMIN_ALERTS_SETUP.sql. Requires SUPABASE_WEBHOOK_SECRET, sent by
// the webhook as the `x-webhook-secret` header.
//
// Safe alongside the browser trigger in UploadForm: notifyFilmPending() claims
// each film once, so whichever fires first sends and the other stays quiet.

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { notifyFilmPending } from '@/lib/adminNotify'

export const dynamic = 'force-dynamic'

function secretOk(req: Request): boolean {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET
  if (!expected) return false // unset → refuse rather than run wide open

  const got =
    req.headers.get('x-webhook-secret') ??
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!got) return false

  // Constant-time compare; equal lengths required by timingSafeEqual.
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

type WebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: { id?: string; status?: string } | null
}

export async function POST(req: Request) {
  if (!secretOk(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: WebhookPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (body.type !== 'INSERT' || body.table !== 'films') {
    // Not an event we act on — 200 so Supabase doesn't retry forever.
    return NextResponse.json({ ok: true, ignored: `${body.type}:${body.table}` })
  }

  const filmId = body.record?.id
  if (!filmId) return NextResponse.json({ error: 'record.id missing' }, { status: 400 })

  // Only films that actually need review.
  if (body.record?.status !== 'pending') {
    return NextResponse.json({ ok: true, ignored: `status:${body.record?.status}` })
  }

  const result = await notifyFilmPending(filmId)
  return NextResponse.json({ ...result, filmId })
}
