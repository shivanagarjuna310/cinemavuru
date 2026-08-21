# Publishing CinemaVuru to the Google Play Store

The app ships as a **TWA (Trusted Web Activity)** — a thin native Android wrapper
that opens your deployed PWA full-screen (no browser bar). Your web code *is* the
app; you don't maintain a separate Android codebase.

**Hard prerequisite:** the site must be live on a public HTTPS domain
(see [`DEPLOY.md`](DEPLOY.md)). Everything below assumes that's done.

---

## Step 1 — Generate the Android App Bundle (.aab)

**Option A — PWABuilder (easiest, no local tooling)**
1. Go to <https://www.pwabuilder.com>, enter your live URL, click **Start**.
2. It scores the manifest/SW (should pass — ours is complete). Click **Package for stores → Android**.
3. Choose **"Signed" / let PWABuilder generate a signing key.**
   - **Download and back up `signing.keystore` + the passwords.** Losing this key
     means you can never update the app again. Store it somewhere safe.
4. Download the ZIP → it contains `app-release-signed.aab` and an
   **`assetlinks.json`** (with your app's SHA-256 fingerprint).

**Option B — Bubblewrap (local; you have JDK 17 + SDK at `C:\Android`)**
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.json
bubblewrap build      # produces app-release-signed.aab + the fingerprint
```

## Step 2 — Host the Digital Asset Links
The file already exists at [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json)
and deploys automatically to `https://cinemavuru.com/.well-known/assetlinks.json`.
You only need to fill in two things, then redeploy:
- `package_name` — must match your TWA build (default here: `com.cinemavuru.app`).
- `sha256_cert_fingerprints` — put **both**:
  1. the **upload key** fingerprint PWABuilder/Bubblewrap generates, and
  2. the **Play App Signing** fingerprint from Play Console
     (**Setup → App integrity → App signing**) — Google re-signs your app, so this
     one is what production installs verify against. Include both to be safe.

This proves you own both the app and the site → removes the URL bar (true
full-screen). Verify `https://cinemavuru.com/.well-known/assetlinks.json` loads
the real fingerprints before submitting.

## Step 3 — Google Play Console
1. Create a developer account: <https://play.google.com/console> — **$25 one-time**.
2. **Create app** → name "CinemaVuru", app (not game), free.
3. Upload the `.aab` under **Testing → Internal testing** first (fast, private).
4. Complete the required forms (see checklist below).
5. Promote **Internal → Closed/Open testing → Production**.

⚠️ **New personal developer accounts** must run a **closed test with ≥12 testers for
14 continuous days** before Production is unlocked. Plan for this — start the closed
test early. (Organization accounts are exempt.)

---

## Store listing assets checklist
| Asset | Spec |
|---|---|
| App icon | 512×512 PNG (you have `icon-512.png` — reuse/upscale to 512) |
| Feature graphic | 1024×500 PNG/JPG (required) |
| Phone screenshots | 2–8, min 320px side, 16:9 or 9:16 (grab from your phone: home, reels, a film, contest) |
| Short description | ≤ 80 chars |
| Full description | ≤ 4000 chars |
| App category | Entertainment |
| Contact email | your support email |
| **Privacy policy URL** | required → use your `/privacy` page |

## Required Play Console forms
- [ ] **Content rating** questionnaire (likely Everyone/Teen — has user comments)
- [ ] **Data safety**: declare what you collect — email + name (auth), likes/comments/
      watch progress. Data is in Supabase; state encryption in transit + at rest.
- [ ] **Target audience & content** (choose 13+ to avoid Families policy overhead)
- [ ] **Ads**: declare "No ads" (unless you add them)
- [ ] **App access**: provide a test login if content is behind sign-in
- [ ] **Government/financial**: N/A

## Suggested copy
- **Short:** "Telugu short films from your district — watch, vote, support local talent."
- **Full:** lead with hyperlocal discovery (browse by district), Reels, the monthly
  contest + prizes, follow filmmakers, and free streaming. Close with the mission:
  *Mana Oori Cinema — the cinema of your district.*

---

## iOS / Apple App Store (later)
Apple **does not accept plain PWAs/TWAs**. For the App Store you'd wrap with
**Capacitor** (loads the same site in a `WKWebView`) and submit via Xcode +
an **Apple Developer account ($99/yr)**. Same web code, more setup and stricter
review. Tackle after Android is live.
