# CinemaVuru Short Film Contest — Season 1

*Validated against the live build, 6 Sep 2026. Dates are set in the database.*
*Items in **[brackets]** still need a decision from you.*

---

## Entry

- **Entry fee:** ₹49 per entry
- **Who can enter:** Any registered CinemaVuru user, from any district
- **Submission window:** **8 September – 25 September 2026** (closes 11:59 pm IST on the 25th)
- **Language:** Telugu
- **Length:** No limit — films are hosted on YouTube and embedded
- **Film age:** Any film is eligible, including films released earlier. It does not need to be made for this contest.
- **It must be your own work.** You must have genuinely contributed to the film you enter — as director, writer, producer, cinematographer, editor, cast, or another credited role. You may not enter a film you had no part in making. Random or anonymous films lifted from elsewhere are not eligible, and entering one is grounds for immediate disqualification with no refund.
- **You may be asked to prove it.** If authorship is unclear, CinemaVuru may ask for the original file, raw footage, cast and crew details, or proof of ownership of the YouTube channel. Entries that cannot be verified are rejected.
- **Entries per filmmaker:** **One entry per account.** Once you have entered, that account cannot enter a second film this season.
- **Your entry goes live after review.** Submitting and paying does not put your film in the running immediately — an admin verifies your payment and approves the entry first, usually within 24 hours. Only approved, paid entries appear on the leaderboard and can collect votes.
- **The ₹49 fee is non-refundable**,excempted if film is not approved.

## Voting

- **Voting window:** **26 September – 9 October 2026** (closes 11:59 pm IST on the 9th)
- Voting opens automatically as soon as submissions close.
- **One vote per registered user, per season.** You may vote for any film, including your own.
- **You can change or withdraw your vote** any time until voting closes. Moving your vote to another film removes it from the first.
- **Only registered users can vote.** Votes are tied to your account, not your device.

## Scoring

- **Winners are decided by public vote.** Films are ranked by total votes received; the highest wins.
- **500 votes unlocks the full prize pool.** Getting your film in front of people is part of the contest — share it, and get your audience to register and vote.
- **If no film reaches 500 votes:** the top three by votes still win, at **[fallback — see note below]**. The contest always produces winners.
- **Votes are one per user for the whole season, not per film.** So every vote your film gets is a vote no other film can have — and the total is capped by how many people register and vote.
- Likes and views do **not** count toward the result. Only votes decide placement.
- Engagement shown on the contest leaderboard counts only what a film earned **after it entered**, so an older film gets no head start over a newer one.

## Prizes

| Place | Prize |
|:--|--:|
| 🥇 1st | ₹9,999 |
| 🥈 2nd | ₹7,000 |
| 🥉 3rd | ₹3,000 |
| **Total pool** | **₹19,999** |

- Paid via **[UPI / bank transfer]** within **[X days]** of results being announced
- Winners are permanently featured on the CinemaVuru **Hall of Fame**, credited to Season 1, with their final vote count shown

## Fair Play

- **Vote manipulation** — bots, purchased votes, or fake accounts — may result in disqualification at CinemaVuru's discretion. Voting patterns are reviewed manually before results are finalised.
- CinemaVuru reserves the right to remove any entry that violates copyright, contains inappropriate content, or misrepresents authorship.
- **Entering someone else's film as your own** is treated as the most serious breach: the entry is disqualified, the fee is not refunded, and the account may be barred from future seasons.
- Every film is reviewed before approval. Entries that are not Telugu-language, that you did not contribute to, or that breach the above, may be rejected — and the entry fee is not refunded.
- These rules are final once submissions open and will not change mid-season.

## Results

- Winners announced **shortly after voting closes on 9 October**, via the CinemaVuru website and Instagram
- The season moves through: **Coming Soon → Submissions Open → Voting → Results Announced (Closed)**

---

Questions? Contact **cinemavuruconnects@gmail.com**

---

# Notes for you — not for publication

## Still needs your decision

**The vote threshold is set to 500** — deliberately, as a growth mechanism: to qualify, a filmmaker has to bring 500 people who *register* and vote, which is the acquisition channel the site does not otherwise have. Agreed, and `min_votes` is now 500 in the database.

Two things about it are worth having in front of you.

**1. Votes are one per user per SEASON, not per film — so they are a shared pool.** Every vote your film gets is one no other film can have. That means the threshold gets *harder* the more films enter, because the same voters split across more entries:

| Entries | Leader's share of all votes | Registered voters needed for one film to clear 500 |
|--:|--:|--:|
| 3 | 50% | ~1,000 |
| 5 | 40% | ~1,250 |
| 10 | 30% | ~1,667 |
| 20 | 20% | ~2,500 |

From 176 users today, that is a 6–14× growth in registered users inside a two-week voting window. Achievable if a good number of filmmakers each push hard — that is the point of the design — but note the perverse edge: **a very successful season (20 entries) makes 500 harder to reach than a quiet one (3 entries).**

**2. This is why the fallback clause matters.** If nobody clears 500 you have two bad options: pay nobody, which reads as a contest that was never winnable and will kill Season 2 entries in a community this small; or pay anyway, which tells everyone the threshold was theatre. Publishing the fallback up front avoids both, and it costs nothing — filmmakers still chase 500 because that is what unlocks the full pool.

Pick one for the `[fallback]` placeholder in Scoring:
- **Reduced pool** — e.g. ₹5,000 / ₹3,000 / ₹1,500 if the leader is under 500. Keeps the incentive sharp and caps your downside.
- **Full pool anyway** — simplest and most generous, but then 500 is only a promotional target, not a condition.
- **Half the pool** — a middle option, ₹4,999 / ₹3,500 / ₹1,500.

I would go with the reduced pool: filmmakers get a real reason to push for 500, and you are never in the position of having advertised ₹19,999 and paid nothing.

**Good news on enforcement:** `min_votes` is advisory in the build, not a hard gate. At close time the admin panel warns *"1st place only has N votes, minimum required 500 — close anyway without prize money?"* and you can proceed either way. So 500 gives you a clear prompt and full discretion, which is exactly right for a threshold like this.

Also still blank: the payout method and the payout window.

## Two changes I made to match your dates

**Dates are now in the database:** submissions 8 Sep 00:00 → 25 Sep 23:59 IST (18 days), voting → 9 Oct 23:59 IST (14 days). These drive the public countdowns, which were previously blank.

**Voting now starts automatically.** Previously only *Coming Soon → Submissions Open* was automated; moving to voting needed an admin to click a button. With 26 September published, a missed click would have left submissions open past their advertised deadline and voting never starting. Both transitions are now automated, with one deliberate guard: if the deadline passes and there are **no paid, approved entries**, voting is *not* started and submissions stay open — an empty voting round would strand the season with no possible winner and no way back. Admins get an email in that case.

Verified: opens on date ✓, refuses to start voting with zero entries ✓, starts voting once one paid+approved entry exists ✓, repeat runs change nothing ✓, Season 1 untouched throughout ✓.

Closing the season is still manual, on purpose — it writes the Hall of Fame and needs a human to confirm placements.

## What your draft claimed that the build does not do

| Your draft | Reality |
|:--|:--|
| "Each entry requires its own ₹49 fee" (implying multiple) | One entry per account, enforced by a unique constraint. There is no way to buy a second. |
| "Votes cannot be changed once cast" | Votes **can** be changed or withdrawn until voting closes. |
| "Minimum 500 votes" | Impossible — see above. |
| "80% audience votes + 20% jury score" | **Not built.** No jury column exists in `contests` or `contest_entries`; ranking is a plain `ORDER BY contest_score DESC` on the raw vote count. |
| "backed by the jury review layer" | No jury layer exists. Fair-play review is manual admin judgement. |
| 1st prize ₹10,000 | ₹9,999, per your GST/TDS change. |

**On the 80/20 formula** — publishing it would misdescribe how the winner is actually chosen. Two options:

- **Publish pure public voting** (what the rules above say). Accurate today, zero work.
- **Build the jury layer** — needs a `jury_score` column, an admin UI to enter scores, and weighted ranking. Roughly half a day, and it must ship *before* voting closes on 9 October.

I would run Season 1 on pure voting and add a jury in Season 2, once you know what turnout actually looks like.

## Risks worth closing

**Fake accounts — and the 500 threshold makes this urgent, not optional.**

Signup does not require a confirmed email before a vote counts. Normally that is a background risk. With a 500-vote threshold it becomes the central one, because the tactic and the exploit are the *same mechanism*: you are asking filmmakers to produce 500 registered accounts that vote for them. The honest way costs weeks of promotion; the dishonest way is a script and 500 throwaway addresses.

So without verification, the threshold does not reward the filmmaker who promotes hardest — it rewards the one most willing to cheat, and it fills your user table with accounts that will never watch anything. That inverts the whole point: you wanted 500 real users per entrant, and you would get 500 rows.

Requiring a confirmed email before a vote counts is a few lines in `/api/contest/vote`, and it is what turns 500 from a fraud incentive into genuine growth. **I would treat this as a prerequisite for the 500 threshold rather than a nice-to-have** — say the word and I will add it before 8 September.

**The authorship rule is policy only — the build cannot check it.** Nothing verifies that an entrant made the film they submit. Worse, the entry form captures nothing an admin could judge it against: it asks for a title, genre, YouTube URL and district, and that is all. There is no field for the entrant's role, no cast or crew, and no credits column on `films`. So an admin reviewing an entry has literally no information to assess the claim, and someone pasting a stranger's YouTube link looks identical to the real filmmaker.

Two small things would make the rule enforceable rather than decorative:

1. **A required "your role in this film" field** on the contest entry form — director / writer / producer / cinematographer / editor / cast / other, plus a short free-text credit line. Cheap to add, and it gives the reviewer something concrete, plus a written claim the entrant is accountable for.
2. **A checkbox declaration** at entry: *"I contributed to this film and have the right to enter it."* Legally useful and it makes the rule visible at the moment it matters, rather than buried in a rules page nobody opens.

Neither is built. Both are quick — say the word and I will add them before 8 September.

## What your draft got right

No change needed: ₹49 fee, any registered user from any district, no length limit, any film age eligible, one vote per user per season, self-voting allowed, permanent Hall of Fame credit, and the status progression.
