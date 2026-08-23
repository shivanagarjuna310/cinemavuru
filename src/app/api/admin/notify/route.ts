// POST /api/admin/notify   { type: 'film_pending', filmId }
// GET  /api/admin/notify   -> { recipients: string[] }   (admins only)
//
// Fans an event out to EVERY admin by email. The film details are read from the
// DB server-side (never trusted from the request body), and the caller must own
// the film — so this endpoint can't be used to spam admins with fake films.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyFilmPending, getAdminRecipients, SITE } from '@/lib/adminNotify'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function callerFromRequest(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Lets admins see exactly who alerts reach (rendered in the admin panel).
export async function GET(req: Request) {
  const user = await callerFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((prof as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
  }

  // fresh: the panel must show the real current list, not a cached one.
  const recipients = await getAdminRecipients({ fresh: true })
  return NextResponse.json({
    recipients,
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
  })
}

export async function POST(req: Request) {
  const user = await callerFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const type = typeof body?.type === 'string' ? body.type : ''

  if (type !== 'film_pending') {
    return NextResponse.json({ error: `Unknown notify type: ${type || '(none)'}` }, { status: 400 })
  }

  const filmId = typeof body?.filmId === 'string' ? body.filmId : ''
  if (!filmId) return NextResponse.json({ error: 'filmId required.' }, { status: 400 })

  // Ownership check needs the row; the notice itself is built in the lib so the
  // DB webhook and this endpoint send exactly the same email (and dedupe).
  const { data: film } = await admin
    .from('films')
    .select('id, creator_id')
    .eq('id', filmId)
    .maybeSingle()

  if (!film) return NextResponse.json({ error: 'Film not found.' }, { status: 404 })

  // Only the creator (or an admin) may trigger the alert for a given film.
  if (film.creator_id !== user.id) {
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if ((prof as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Not your film.' }, { status: 403 })
    }
  }

  const result = await notifyFilmPending(film.id)
  return NextResponse.json({ ...result, site: SITE })
}
