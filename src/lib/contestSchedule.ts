// SERVER-ONLY. Moves a contest through its published schedule on its own.
//
// Two transitions are automated:
//   upcoming -> open    when submissions_open_at passes
//   open     -> voting  when submissions_close_at passes
//
// Both matter because the dates are advertised publicly. Season 1 tells
// entrants submissions close 25 Sep and voting runs from 26 Sep — if that
// depended on somebody clicking a button at midnight, a missed click would
// leave submissions open past their published deadline and voting never
// starting. Closing is NOT automated: it writes the Hall of Fame and needs a
// human to pick placements.
//
// WHY NOT A CRON: Vercel Hobby allows two cron jobs and both are already used
// (milestones + admin-digest), and Hobby crons run once a day, so a midnight
// deadline could sit stale for hours. Instead this runs lazily during the
// /contest page's ISR revalidation (~30s) with the daily cron as a backstop.
//
// Every write is guarded by the status it expects, so it fires at most once per
// transition and concurrent renders cannot double-apply it — which matters on
// the free tier, where the Disk IO budget is already tight.

import { createClient } from '@supabase/supabase-js'
import { announceContestOpen } from '@/lib/contestAnnounce'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export type AdvanceResult =
  | { changed: false; reason: 'no_contest' | 'not_due' | 'no_entries' | 'error' }
  | { changed: true; to: 'open' | 'voting'; id: string; title: string; entryCount?: number }

/**
 * Advance the current season if its schedule says so. Safe to call on every
 * render: in every case except the exact moment a transition is due, it
 * short-circuits without writing.
 */
export async function autoAdvanceContest(): Promise<AdvanceResult> {
  try {
    const { data: c } = await admin
      .from('contests')
      .select('id, title, status, submissions_open_at, submissions_close_at')
      .in('status', ['upcoming', 'open'])
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!c) return { changed: false, reason: 'no_contest' }
    const now = Date.now()

    // ── upcoming -> open ──────────────────────────────────────────────────
    if (c.status === 'upcoming') {
      if (!c.submissions_open_at) return { changed: false, reason: 'not_due' }
      if (new Date(c.submissions_open_at).getTime() > now) {
        return { changed: false, reason: 'not_due' }
      }
      const { data: up, error } = await admin
        .from('contests')
        .update({ status: 'open' })
        .eq('id', c.id)
        .eq('status', 'upcoming')      // idempotent under concurrent renders
        .select('id, title')
        .maybeSingle()
      if (error || !up) return { changed: false, reason: 'error' }
      console.log(`[contestSchedule] auto-opened "${up.title}" (${up.id})`)

      // Tell every registered user that entries are open. The status guard
      // above means only one render reaches this, and the send dedupes per
      // address in email_logs, so nobody can be mailed twice.
      //
      // Capped low on purpose: this can run inside the /contest revalidation,
      // where a long render risks the function timeout. Two Resend batches is a
      // couple of seconds; the daily crons mail whoever is left.
      const announced = await announceContestOpen(up.id, { maxPerRun: 200 })
      if (announced) {
        console.log(
          `[contestSchedule] announced open to ${announced.sent} user(s), ${announced.failed} failed, ${announced.remaining} left`,
        )
      }

      return { changed: true, to: 'open', id: up.id, title: up.title }
    }

    // ── open -> voting ────────────────────────────────────────────────────
    if (!c.submissions_close_at) return { changed: false, reason: 'not_due' }
    if (new Date(c.submissions_close_at).getTime() > now) {
      return { changed: false, reason: 'not_due' }
    }

    // Refuse to start voting with nothing to vote on. An empty voting round is
    // worse than a late one: it strands the season with no possible winner and
    // no way back. Leave submissions open and let the daily digest raise it.
    const { count } = await admin
      .from('contest_entries')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', c.id)
      .eq('payment_status', 'paid')
      .eq('is_approved', true)
    const entryCount = count ?? 0
    if (entryCount === 0) {
      console.warn(
        `[contestSchedule] "${c.title}" was due to start voting but has no paid, approved entries — left open`,
      )
      return { changed: false, reason: 'no_entries' }
    }

    const { data: up, error } = await admin
      .from('contests')
      .update({ status: 'voting' })
      .eq('id', c.id)
      .eq('status', 'open')
      .select('id, title')
      .maybeSingle()
    if (error || !up) return { changed: false, reason: 'error' }
    console.log(`[contestSchedule] auto-started voting on "${up.title}" (${up.id})`)
    return { changed: true, to: 'voting', id: up.id, title: up.title, entryCount }
  } catch (e) {
    console.error('[contestSchedule] autoAdvanceContest failed:', e)
    return { changed: false, reason: 'error' }
  }
}
