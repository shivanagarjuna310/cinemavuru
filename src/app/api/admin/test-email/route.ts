// POST /api/admin/test-email  { to? }
// Sends a sample milestone email so an admin can verify email delivery.
// Auth: caller must be a logged-in admin (verified via their access token).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
function getResend(): Resend | null {
  const k = process.env.RESEND_API_KEY
  return k ? new Resend(k) : null
}
const FROM = process.env.FROM_EMAIL ?? 'CinemaVuru <onboarding@resend.dev>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

export async function POST(req: Request) {
  // Verify the caller is an authenticated admin.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })

  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if ((prof as any)?.role !== 'admin') return NextResponse.json({ error: 'Admins only.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const recipient: string | undefined = (typeof body?.to === 'string' && body.to.trim()) || user.email || undefined
  if (!recipient) return NextResponse.json({ error: 'No recipient email.' }, { status: 400 })

  const resend = getResend()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set on the server (works in production).' }, { status: 503 })
  }

  const subject = '🎉 Test — CinemaVuru milestone email'
  try {
    const { data, error: sendErr } = await resend.emails.send({
      from: FROM,
      to: recipient,
      subject,
      html: sampleHtml(),
    })
    if (sendErr) {
      await logEmail({ kind: 'test', to_email: recipient, subject, creator_id: user.id, status: 'failed', error: sendErr.message })
      return NextResponse.json({ error: sendErr.message ?? 'Send failed.' }, { status: 502 })
    }
    await logEmail({ kind: 'test', to_email: recipient, subject, creator_id: user.id, status: 'sent' })
    return NextResponse.json({ ok: true, to: recipient, id: (data as any)?.id ?? null })
  } catch (e: any) {
    await logEmail({ kind: 'test', to_email: recipient, subject, creator_id: user.id, status: 'failed', error: e?.message })
    return NextResponse.json({ error: e?.message ?? 'Send failed.' }, { status: 502 })
  }
}

async function logEmail(row: {
  kind: string; to_email: string; subject: string
  creator_id?: string | null; status: string; error?: string
}) {
  try { await admin.from('email_logs').insert(row) } catch {}
}

function sampleHtml() {
  const filmUrl = `${SITE}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent('Watch & support my short film on CinemaVuru 🎬 ' + filmUrl)}`
  return `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:14px;">
    <div style="color:#D4A017;font-weight:800;letter-spacing:1px;font-size:14px;">CINEMAVURU</div>
    <h1 style="color:#fff;font-size:26px;margin:14px 0 6px;">500 views 🎉</h1>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 8px;">Hi there,</p>
    <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 20px;">This is a <b>test</b> of CinemaVuru's milestone emails. Real ones celebrate your film's views/likes and nudge you to share for more.</p>
    <div style="background:#1A1208;border:1px solid #2E2010;border-radius:10px;padding:14px 16px;margin-bottom:22px;">
      <span style="color:#7A6040;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Now at</span>
      <div style="color:#FFC845;font-weight:800;font-size:18px;margin-top:4px;">👁 500 views &nbsp;·&nbsp; ❤️ 42 likes</div>
    </div>
    <a href="${whatsapp}" style="display:block;text-align:center;background:linear-gradient(90deg,#FF6B1A,#D4A017);color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin-bottom:10px;">📣 Share on WhatsApp — get more views</a>
    <a href="${filmUrl}" style="display:block;text-align:center;border:1px solid #2E2010;color:#FDF6E3;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;">Open CinemaVuru →</a>
    <p style="color:#4A3020;font-size:11px;margin-top:28px;">CinemaVuru — the cinema of your district. (Test email sent from the admin panel.)</p>
  </div>`
}
