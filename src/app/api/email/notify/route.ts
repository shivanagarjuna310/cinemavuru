// src/app/api/email/notify/route.ts
// Handles all email notifications for CinemaVuru
// Called when: film uploaded, film approved, film rejected

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend    = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const FROM_EMAIL  = 'CinemaVuru <onboarding@resend.dev>'

export async function POST(request: NextRequest) {
  try {
    const { type, filmTitle, creatorName, creatorEmail } = await request.json()

    // ── EMAIL 1: Admin notified when film uploaded ─────────
    if (type === 'film_uploaded') {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      ADMIN_EMAIL,
        subject: `🎬 New Film Submitted — ${filmTitle}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:12px;">
            <h2 style="color:#D4A017;margin-top:0;">New Film Submitted 🎬</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#7A6040;width:100px;">Film</td>
                  <td style="padding:8px 0;font-weight:bold;">${filmTitle}</td></tr>
              <tr><td style="padding:8px 0;color:#7A6040;">Creator</td>
                  <td style="padding:8px 0;">${creatorName}</td></tr>
              <tr><td style="padding:8px 0;color:#7A6040;">Email</td>
                  <td style="padding:8px 0;">${creatorEmail}</td></tr>
            </table>
            <a href="https://www.cinemavuru.com/cv-admin-1a25"
               style="display:inline-block;margin-top:24px;background:#FF6B1A;color:white;
                      padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Review in Admin →
            </a>
            <p style="color:#4A3020;font-size:12px;margin-top:32px;">
              CinemaVuru — Hyperlocal Short Films from Telangana
            </p>
          </div>
        `,
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