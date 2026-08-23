// src/app/api/email/notify/route.ts
// Creator-facing email notifications for CinemaVuru.
// Called when: film approved, film rejected.
//
// Admin-facing alerts (new film pending, payments, daily digest) live in
// src/lib/adminNotify.ts + /api/admin/notify — they go to EVERY admin, are
// authenticated, and read their details from the DB rather than the request.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { notifyAdmins } from '@/lib/adminNotify'

// Lazy so the module doesn't throw at build/import time when the key is absent.
function getResend(): Resend | null {
  const k = process.env.RESEND_API_KEY
  return k ? new Resend(k) : null
}
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
// `||` not `??` — an env var set to an empty string must fall back too.
const FROM_EMAIL  = process.env.FROM_EMAIL?.trim() || 'CinemaVuru <noreply@cinemavuru.com>'

export async function POST(request: NextRequest) {
  try {
    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 503 })
    }
    const { type, filmTitle, creatorName, creatorEmail } = await request.json()

    // ── LEGACY: uploads now call /api/admin/notify instead, which reaches
    // every admin. Kept so browsers still running the old bundle don't lose
    // the alert — it just forwards to the all-admins sender.
    if (type === 'film_uploaded') {
      await notifyAdmins({
        kind: 'film_pending',
        tone: 'info',
        subject: `New film awaiting review — ${filmTitle}`,
        heading: 'New film submitted',
        intro: 'A creator just submitted a film. It stays hidden from the site until an admin approves it.',
        rows: [
          ['Film', String(filmTitle ?? '—')],
          ['Creator', String(creatorName ?? 'Unknown')],
          ['Email', String(creatorEmail ?? '—')],
        ],
        ctaLabel: 'Review in Admin',
        ctaPath: '/cv-admin-1a25',
      })
    }

    // ── EMAIL 2: Creator notified when film approved ───────
    if (type === 'film_approved') {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      creatorEmail,
        subject: `✅ Your film "${filmTitle}" is LIVE on CinemaVuru!`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:12px;">
            <h2 style="color:#22c55e;margin-top:0;">Your Film is Live! 🎉</h2>
            <p>Hi ${creatorName},</p>
            <p>Your film <strong style="color:#D4A017;">"${filmTitle}"</strong> has been 
               approved and is now live on CinemaVuru!</p>
            <p style="color:#7A6040;">Share it with your friends and family to get more views and votes.</p>
            <a href="https://www.cinemavuru.com/telangana/hyderabad"
               style="display:inline-block;margin-top:24px;background:#FF6B1A;color:white;
                      padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
              View Your Film →
            </a>
            <p style="color:#4A3020;font-size:12px;margin-top:32px;">
              CinemaVuru — Hyperlocal Short Films from Telangana
            </p>
          </div>
        `,
      })
    }

    // ── EMAIL 3: Creator notified when film rejected ───────
    if (type === 'film_rejected') {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      creatorEmail,
        subject: `ℹ️ Update on your film "${filmTitle}" — CinemaVuru`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:12px;">
            <h2 style="color:#FF6B1A;margin-top:0;">Film Review Update</h2>
            <p>Hi ${creatorName},</p>
            <p>We reviewed <strong style="color:#D4A017;">"${filmTitle}"</strong> and 
               it doesn't meet our current guidelines.</p>
            <p style="color:#7A6040;">You're welcome to make changes and resubmit anytime. 
               Contact us at ${ADMIN_EMAIL} if you have questions.</p>
            <a href="https://www.cinemavuru.com/upload"
               style="display:inline-block;margin-top:24px;background:#FF6B1A;color:white;
                      padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Submit Another Film →
            </a>
            <p style="color:#4A3020;font-size:12px;margin-top:32px;">
              CinemaVuru — Hyperlocal Short Films from Telangana
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}