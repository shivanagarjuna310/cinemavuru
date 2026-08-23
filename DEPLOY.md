# Deploying CinemaVuru (Vercel)

A public **HTTPS** deployment is the prerequisite for everything else — the
Android/Play Store app is just a native shell that loads this live site.

## 1. Push the repo to GitHub
Already done — the code is on GitHub (`shivanagarjuna310/cinemavuru`).

## 2. Import into Vercel
1. Go to <https://vercel.com/new> and sign in with GitHub.
2. Import the `cinemavuru` repo. Vercel auto-detects Next.js — no build config needed.
3. Before the first deploy, add the environment variables (next step).

## 3. Environment variables
Add every variable from [`.env.example`](.env.example) in
**Project → Settings → Environment Variables** (Production + Preview).

| Variable | Secret? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | server-only, bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | no | **set to your real domain**, e.g. `https://www.cinemavuru.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | no | contest payments |
| `RAZORPAY_KEY_SECRET` | **yes** | |
| `CASHFREE_APP_ID` | **yes** | |
| `CASHFREE_SECRET_KEY` | **yes** | |
| `NEXT_PUBLIC_CASHFREE_ENV` | no | `production` or `sandbox` |
| `RESEND_API_KEY` | **yes** | email (digest/transactional) |
| `FROM_EMAIL` | no | verified sender |
| `ADMIN_EMAIL` | no | fallback admin alert recipient (alerts already go to every `role='admin'` profile) |
| `ADMIN_EMAILS` | no | extra admin alert recipients, comma-separated (shared inbox / on-call alias) |
| `CRON_SECRET` | no | **set it** — protects `/api/cron/*` from public triggering |
| `SUPABASE_WEBHOOK_SECRET` | **yes** | shared secret for the "new film" DB webhook; unset = webhook refuses all calls |

⚠️ **`NEXT_PUBLIC_SITE_URL` must be the production HTTPS URL** — it drives canonical
URLs, OG share cards, and the sitemap. Leaving it as `localhost` breaks all of those.

## 4. Custom domain (recommended)
**Project → Settings → Domains** → add `cinemavuru.com` and `www.cinemavuru.com`,
then point your registrar's DNS at Vercel. A stable domain is what the Play Store
app (and Digital Asset Links) verifies against — pick it before wrapping.

### Admin alert emails
Alerts (new film pending review, contest entry paid, payment problems, daily digest)
go to **every** profile with `role = 'admin'`, resolved live from Supabase — promote a
user to admin and they start receiving them with no redeploy. `ADMIN_EMAIL` /
`ADMIN_EMAILS` are only for addresses with no account. Verify the live recipient list
under **Admin → Email → Admin Alerts**.

Crons (`vercel.json`): `/api/cron/milestones` (11:30 UTC) and `/api/cron/admin-digest`
(03:30 UTC / 9:00 AM IST) — the digest is also the safety net if an instant
"film submitted" alert never fires. Two daily crons is exactly the Vercel Hobby
ceiling, so don't add a third without upgrading.

Run `ADMIN_ALERTS_SETUP.sql` in Supabase, and create the Database Webhook it
describes (Database → Webhooks → INSERT on `public.films` →
`POST /api/webhooks/film-created` with the `x-webhook-secret` header). That makes
the upload alert fire from Postgres, so a closed browser tab can't lose it. The
browser also still pings it; the claims table makes sure only one email goes out.

## 5. Post-deploy checklist (do these once live)
- [ ] Run the DB migrations in Supabase SQL editor: `OTT_FEATURES_SETUP.sql`, plus
      any pending policies (`watchlist`, comments DELETE) and `VIEW_COUNT_CLEANUP.sql`.
- [ ] **Supabase → Authentication → URL Configuration**: set Site URL to your domain
      and add it to Redirect URLs (else magic links / OAuth break in production).
- [ ] **Google Cloud OAuth**: add `https://YOUR-DOMAIN/auth/callback` (and the Supabase
      callback) to Authorized redirect URIs, so Google sign-in works.
- [ ] Verify `https://YOUR-DOMAIN/manifest.json`, `/sw.js`, `/opengraph-image`,
      `/sitemap.xml`, `/robots.txt` all load.
- [ ] Open the site on a phone → confirm the "Add to Home Screen" prompt appears
      (needs HTTPS — this is what LAN testing can't show).

Once this is live and installable, proceed to [`PLAYSTORE.md`](PLAYSTORE.md).
