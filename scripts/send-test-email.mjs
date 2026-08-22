// One-off test sender for a milestone email.
// Usage: RESEND_API_KEY=xxx FROM_EMAIL="CinemaVuru <noreply@cinemavuru.com>" \
//        node scripts/send-test-email.mjs recipient@example.com
import { Resend } from 'resend'

const TO = process.argv[2] || 'gouthamsaivvv@gmail.com'
const KEY = process.env.RESEND_API_KEY
const FROM = process.env.FROM_EMAIL || 'CinemaVuru <onboarding@resend.dev>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'

if (!KEY) { console.error('❌ RESEND_API_KEY not provided'); process.exit(1) }

const filmUrl = `${SITE}/telangana/hyderabad/film/685aabfb-d331-47cd-b561-3709027e1df8`
const whatsapp = `https://wa.me/?text=${encodeURIComponent('Watch & support my short film on CinemaVuru 🎬 ' + filmUrl)}`

const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0D0A06;color:#FDF6E3;padding:32px;border-radius:14px;">
  <div style="color:#D4A017;font-weight:800;letter-spacing:1px;font-size:14px;">CINEMAVURU</div>
  <h1 style="color:#fff;font-size:26px;margin:14px 0 6px;">500 views 🎉</h1>
  <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 8px;">Hi Goutham,</p>
  <p style="color:#E7DCC5;font-size:15px;line-height:1.6;margin:0 0 20px;">Momentum is building. Just <b>500 more views</b> to reach 1K — share it now to get there faster.</p>
  <div style="background:#1A1208;border:1px solid #2E2010;border-radius:10px;padding:14px 16px;margin-bottom:22px;">
    <span style="color:#7A6040;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Now at</span>
    <div style="color:#FFC845;font-weight:800;font-size:18px;margin-top:4px;">👁 500 views &nbsp;·&nbsp; ❤️ 42 likes</div>
  </div>
  <a href="${whatsapp}" style="display:block;text-align:center;background:linear-gradient(90deg,#FF6B1A,#D4A017);color:#000;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin-bottom:10px;">📣 Share on WhatsApp — get more views</a>
  <a href="${filmUrl}" style="display:block;text-align:center;border:1px solid #2E2010;color:#FDF6E3;padding:12px;border-radius:10px;text-decoration:none;font-weight:700;">View your film →</a>
  <p style="color:#4A3020;font-size:11px;margin-top:28px;">CinemaVuru — the cinema of your district. (This is a test email.)</p>
</div>`

const resend = new Resend(KEY)
const { data, error } = await resend.emails.send({
  from: FROM,
  to: TO,
  subject: '🎉 "Ela Unnav?" just hit 500 views! (test)',
  html,
})
if (error) { console.error('❌ Send failed:', error); process.exit(1) }
console.log('✅ Sent to', TO, '| id:', data?.id)
