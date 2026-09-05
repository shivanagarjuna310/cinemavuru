// SERVER-ONLY. Opens the contest automatically when its scheduled time passes.
//
// WHY NOT A CRON: Vercel Hobby allows exactly two cron jobs and both are already
// used (milestones + admin-digest), and Hobby crons only run once a day — a
// contest advertised as starting at midnight would sit closed for hours.
//
// Instead this runs lazily during the /contest page's ISR revalidation (every
// 30s) with the daily cron as a backstop. The guard means the UPDATE fires at
// most once: after the flip the status is no longer 'upcoming', so the
// condition can never match again. That matters on the free tier, where the
// Disk IO budget is already tight.

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export type AutoOpenResult =
  | { opened: false; reason: 'no_contest' | 'not_upcoming' | 'no_date' | 'not_yet' | 'error' }
  | { opened: true; id: string; title: string }

/**
 * Flip the newest 'upcoming' contest to 'open' once submissions_open_at passes.
 * Safe to call on every render — it short-circuits without writing in every
 * case except the single moment the schedule is actually due.
 */
export async function autoOpenDueContest(): Promise<AutoOpenResult> {
  try {
    const { data: c } = await admin
      .from('contests')
      .select('id, title, status, submissions_open_at')
      .eq('status', 'upcoming')
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!c) return { opened: false, reason: 'no_contest' }
    if (c.status !== 'upcoming') return { opened: false, reason: 'not_upcoming' }
    if (!c.submissions_open_at) return { opened: false, reason: 'no_date' }
    if (new Date(c.submissions_open_at).getTime() > Date.now()) {
      return { opened: false, reason: 'not_yet' }
    }

    // `.eq('status','upcoming')` makes this idempotent: if two renders race,
    // only the first one matches a row and the second updates nothing.
    const { data: updated, error } = await admin
      .from('contests')
      .update({ status: 'open' })
      .eq('id', c.id)
      .eq('status', 'upcoming')
      .select('id, title')
      .maybeSingle()

    if (error || !updated) return { opened: false, reason: 'error' }
    console.log(`[contestSchedule] auto-opened "${updated.title}" (${updated.id})`)
    return { opened: true, id: updated.id, title: updated.title }
  } catch (e) {
    console.error('[contestSchedule] autoOpenDueContest failed:', e)
    return { opened: false, reason: 'error' }
  }
}
