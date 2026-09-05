// POST /api/contest/vote   { contestId, filmId, action: 'vote' | 'unvote' }
//
// WHY A SERVER ROUTE: voting used to be a browser insert into contest_votes
// followed by an increment_contest_score RPC. Two problems with that:
//
//   1. There was no way back. The client locked itself with `hasVoted` and
//      offered no un-vote, so a mis-tap was permanent.
//   2. The score was a running counter incremented client-side. Any failed or
//      duplicated call drifted it away from the real number of votes, and
//      nothing ever reconciled it.
//
// So the score is no longer incremented — it is RECOMPUTED from an actual
// count(*) of contest_votes after every change. That makes it self-healing:
// even if a previous drift exists, the next vote on that film corrects it.
//
// Voting is only allowed while the contest is in its 'voting' phase, checked
// server-side so a stale page cannot vote on a closed season.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

/** Recompute an entry's score from the vote table. Authoritative, not a delta. */
async function syncScore(contestId: string, filmId: string): Promise<number> {
  const { count } = await admin
    .from('contest_votes')
    .select('user_id', { count: 'exact', head: true })
    .eq('contest_id', contestId)
    .eq('film_id', filmId)
  const score = count ?? 0
  await admin
    .from('contest_entries')
    .update({ contest_score: score })
    .eq('contest_id', contestId)
    .eq('film_id', filmId)
  return score
}

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Please sign in to vote.' }, { status: 401 })

  const { data: auth, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: 'Your session expired — please sign in again.' }, { status: 401 })
  }
  const userId = auth.user.id

  const body = await req.json().catch(() => ({}))
  const contestId = typeof body?.contestId === 'string' ? body.contestId : ''
  const filmId = typeof body?.filmId === 'string' ? body.filmId : ''
  const action = body?.action === 'unvote' ? 'unvote' : 'vote'
  if (!contestId) return NextResponse.json({ error: 'contestId required.' }, { status: 400 })
  if (action === 'vote' && !filmId) {
    return NextResponse.json({ error: 'filmId required.' }, { status: 400 })
  }

  // The season must actually be open for voting.
  const { data: contest } = await admin
    .from('contests').select('id, status').eq('id', contestId).maybeSingle()
  if (!contest) return NextResponse.json({ error: 'Contest not found.' }, { status: 404 })
  if (contest.status !== 'voting') {
    return NextResponse.json({ error: 'Voting is not open for this contest.' }, { status: 409 })
  }

  // Whatever the user voted for before — needed so we can re-sync that film's
  // score when the vote moves away from it or is withdrawn.
  const { data: prev } = await admin
    .from('contest_votes')
    .select('film_id')
    .eq('contest_id', contestId)
    .eq('user_id', userId)
    .maybeSingle()
  const prevFilmId = prev?.film_id ?? null

  if (action === 'unvote') {
    if (!prevFilmId) {
      return NextResponse.json({ ok: true, votedFilmId: null, note: 'no vote to remove' })
    }
    const { error } = await admin
      .from('contest_votes').delete()
      .eq('contest_id', contestId).eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const score = await syncScore(contestId, prevFilmId)
    return NextResponse.json({ ok: true, votedFilmId: null, scores: { [prevFilmId]: score } })
  }

  // Voting for the film already voted for is a no-op, not an error.
  if (prevFilmId === filmId) {
    return NextResponse.json({ ok: true, votedFilmId: filmId, note: 'already voted for this film' })
  }

  // The entry must exist, be paid and be approved — same bar the public
  // leaderboard uses, so an unapproved entry cannot collect votes.
  const { data: entry } = await admin
    .from('contest_entries')
    .select('id')
    .eq('contest_id', contestId)
    .eq('film_id', filmId)
    .eq('payment_status', 'paid')
    .eq('is_approved', true)
    .maybeSingle()
  if (!entry) {
    return NextResponse.json({ error: 'That film is not accepting votes.' }, { status: 409 })
  }

  // Moving the vote: drop the old row first so the unique constraint on
  // (contest_id, user_id) does not reject the new one.
  if (prevFilmId) {
    await admin.from('contest_votes').delete()
      .eq('contest_id', contestId).eq('user_id', userId)
  }

  const { error: insErr } = await admin
    .from('contest_votes')
    .insert({ contest_id: contestId, user_id: userId, film_id: filmId })
  if (insErr) {
    // Put the old vote back rather than leaving the user with none.
    if (prevFilmId) {
      await admin.from('contest_votes')
        .insert({ contest_id: contestId, user_id: userId, film_id: prevFilmId })
        .then(() => syncScore(contestId, prevFilmId))
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const scores: Record<string, number> = {}
  scores[filmId] = await syncScore(contestId, filmId)
  if (prevFilmId) scores[prevFilmId] = await syncScore(contestId, prevFilmId)

  return NextResponse.json({ ok: true, votedFilmId: filmId, scores })
}
