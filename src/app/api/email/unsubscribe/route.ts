// GET /api/email/unsubscribe?uid=<userId>
// One-click opt-out of milestone emails (link lives in every such email).

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function page(msg: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CinemaVuru</title></head>
     <body style="font-family:sans-serif;background:#0D0A06;color:#FDF6E3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">
       <div style="text-align:center;max-width:420px;padding:32px;">
         <div style="color:#D4A017;font-weight:800;letter-spacing:1px;">CINEMAVURU</div>
         <p style="font-size:16px;line-height:1.6;margin-top:16px;">${msg}</p>
         <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cinemavuru.com'}" style="color:#FF6B1A;">← Back to CinemaVuru</a>
       </div>
     </body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: Request) {
  const uid = new URL(req.url).searchParams.get('uid')
  if (!uid) return page('Invalid unsubscribe link.')
  const { error } = await admin.from('profiles').update({ email_opt_in: false }).eq('id', uid)
  if (error) return page('Could not update your preference. Please try again later.')
  return page("You've been unsubscribed from milestone emails. You can re-enable them anytime from your profile.")
}
