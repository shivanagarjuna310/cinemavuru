// POST /api/contest/entry/cancel   { entryId }
//
// Lets a creator abandon an UNPAID contest entry so they can pick a different
// film. Without this the entry form was a one-way door: init() found the
// existing row and always resumed the payment screen, so a creator who entered
// the wrong film had no way to change it — the only escape was an admin
// deleting the row by hand.
//
// Deliberately server-side rather than a browser delete:
//   • ownership is verified against the caller's token, not trusted from input;
//   • only 'pending' entries can be cancelled. 'paid' and
//     'pending_verification' both mean money has already moved, so those must
//     go through an admin, not a self-service button.
//
// The film itself is never deleted — it belongs to the creator and stays
// published independently of the contest.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: auth, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: 'Your session expired — please sign in again.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const entryId = typeof body?.entryId === 'string' ? body.entryId : ''
  if (!entryId) return NextResponse.json({ error: 'entryId required.' }, { status: 400 })

  const { data: entry } = await admin
    .from('contest_entries')
    .select('id, creator_id, payment_status')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry) return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
  if (entry.creator_id !== auth.user.id) {
    return NextResponse.json({ error: 'That is not your entry.' }, { status: 403 })
  }
  if (entry.payment_status !== 'pending') {
    return NextResponse.json(
      {
        error:
          entry.payment_status === 'paid'
            ? 'This entry is already paid — contact us to change it.'
            : 'Your payment is being verified — contact us if you need to change your film.',
      },
      { status: 409 },
    )
  }

  const { error } = await admin.from('contest_entries').delete().eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
