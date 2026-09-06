'use client'
// src/components/ContestEntryForm.tsx — with Cashfree payment integrated

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'
import { useAuth }             from '@/components/AuthProvider'
import CashfreeButton          from '@/components/CashfreeButton'
import UPIPayment from '@/components/UPIPayment'
import ContestRulesModal from '@/components/ContestRulesModal'
const ROLES = ['Director','Writer','Producer','Cinematographer','Editor','Cast','Music','Other']

// ── Types ─────────────────────────────────────────────────────
type Contest = {
  id:                   string
  title:                string
  status:               string
  min_votes:            number | null
  season_number:        number | null
  submissions_open_at:  string | null
  voting_close_at:      string | null
  entry_fee:            number
  prize_1st:            number
  prize_2nd:            number
  prize_3rd:            number
  submissions_close_at: string | null
}

type Film = {
  id:       string
  title_en: string
}

type UserInfo = {
  id:    string
  email: string
  name:  string
}

export default function ContestEntryForm() {
  const router = useRouter()
  const { user } = useAuth()

  const [userInfo,       setUserInfo]       = useState<UserInfo | null>(null)
  const [contest,        setContest]        = useState<Contest | null>(null)
  const [myFilms,        setMyFilms]        = useState<Film[]>([])
  const [filmId,         setFilmId]         = useState('')
  const [newTitle,       setNewTitle]       = useState('')
  const [newGenre,       setNewGenre]       = useState('Drama')
  const [youtubeUrl,     setYoutubeUrl]     = useState('')
  const [status,         setStatus]         = useState<'idle'|'loading'|'submitted'|'paid'|'error'>('idle')
  const [message,        setMessage]        = useState('')
  const [alreadyEntered, setAlreadyEntered] = useState(false)
  const [districtId,     setDistrictId]     = useState('')
  const [districts,      setDistricts]      = useState<{ id: string; name_en: string }[]>([])
  // Declared by the entrant — the "must be your own work" rule is otherwise
  // unenforceable, since nothing in the build can verify authorship and the
  // form previously captured nothing a reviewer could judge it against.
  const [entrantRole,   setEntrantRole]   = useState('')
  const [entrantCredit, setEntrantCredit] = useState('')
  const [entrantPhone,  setEntrantPhone]  = useState('')
  // Resolved directly rather than looked up in myFilms: a film created through
  // this form is `pending`, and myFilms only holds `active` ones, so the
  // payment screen fell back to the useless label "your film".
  const [submittedFilmTitle, setSubmittedFilmTitle] = useState('')
  const [submittedFilmId,  setSubmittedFilmId]  = useState('')
  const [submittedEntryId, setSubmittedEntryId] = useState('') // ← NEW: contest_entry row ID

  useEffect(() => {
    if (!user) return
    async function init() {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      setUserInfo({
        id:    user.id,
        email: user.email ?? '',
        name:  profile?.name ?? 'Filmmaker',
      })

      // Any live season, not just an open one. Previously this filtered on
      // status='open', so during voting the page reported "No Active Contest"
      // — untrue, and a dead end for anyone arriving from the nav link.
      const { data: c } = await supabase
        .from('contests')
        .select('id, title, status, min_votes, season_number, submissions_open_at, voting_close_at, entry_fee, prize_1st, prize_2nd, prize_3rd, submissions_close_at')
        .in('status', ['upcoming', 'open', 'voting'])
        .order('season_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (c) setContest(c as Contest)
      if (!c) return
      // Only an open season has an entry flow; the screens below explain the rest.
      if (c.status !== 'open') return

      const { data: films } = await supabase
        .from('films')
        .select('id, title_en')
        .eq('creator_id', user.id)
        .eq('status', 'active')
      setMyFilms(films ?? [])

      const { data: districtList } = await supabase
        .from('districts')
        .select('id, name_en')
        .eq('is_active', true)
        .order('name_en', { ascending: true })
      setDistricts(districtList ?? [])

      const { data: entry } = await supabase
        .from('contest_entries')
        .select('id, payment_status, film_id')
        .eq('contest_id', c.id)
        .eq('creator_id', user.id)
        .maybeSingle()

      if (entry) {
        // Look the title up directly; the film may be `pending` and so absent
        // from myFilms, which is what made this read "your film".
        const { data: ef } = await supabase
          .from('films').select('title_en').eq('id', entry.film_id).maybeSingle()
        if (ef?.title_en) setSubmittedFilmTitle(ef.title_en)
        setSubmittedEntryId(entry.id)
        setSubmittedFilmId(entry.film_id)

        // Three distinct states, not two. This used to test only for 'paid',
        // so an entry sitting at 'pending_verification' — meaning the creator
        // HAS paid and submitted their UTR — fell into the unpaid branch and
        // was shown the QR again on every refresh, asking them to pay twice.
        if (entry.payment_status === 'paid') {
          setAlreadyEntered(true)
        } else if (entry.payment_status === 'pending_verification') {
          // Paid, awaiting admin verification. Nothing left for them to do.
          setStatus('paid')
        } else {
          // Genuinely unpaid — resume the payment screen.
          setStatus('submitted')
          setMessage('Complete your payment to confirm your contest entry.')
        }
      }
    }
    init()
  }, [user])

  // Rules must be acknowledged before an entry can be submitted. Two of the
  // rules cannot be enforced by the build at all — that the entrant
  // contributed to the film, and that the fee is non-refundable — so an
  // explicit, timestamped claim at entry is the only real control available.
  const [rulesOpen, setRulesOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  async function recordAcknowledgement() {
    setAcknowledged(true)
    // Audit trail. Best-effort: never block an entry because logging failed.
    try {
      await supabase.from('logs').insert({
        event_type: 'contest_rules_accepted',
        user_id: userInfo?.id ?? null,
        metadata: {
          contest: contest?.id ?? '',
          season: String(contest?.season_number ?? ''),
          declared_own_work: 'true',
          at: new Date().toISOString(),
        },
      })
    } catch { /* best-effort */ }
  }

  // Abandon an unpaid entry so a different film can be chosen. Without this
  // the payment screen was a one-way door: init() always resumed it, so a
  // creator who picked the wrong film was stuck with it.
  const [cancelling, setCancelling] = useState(false)
  async function changeFilm() {
    if (!submittedEntryId) { setStatus('idle'); return }
    if (!window.confirm('Discard this entry and choose a different film?\n\nNothing has been paid yet, and your uploaded film stays published.')) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/contest/entry/cancel', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ entryId: submittedEntryId }),
      })
      const j = await res.json()
      if (!res.ok) { setMessage(j.error || 'Could not change your entry.'); return }
      // Back to a clean form.
      setSubmittedEntryId('')
      setSubmittedFilmId('')
      setFilmId('')
      setNewTitle('')
      setYoutubeUrl('')
      setMessage('')
      setStatus('idle')
    } catch {
      setMessage('Network problem — please try again.')
    } finally {
      setCancelling(false)
    }
  }

  function toEmbedUrl(url: string): string | null {
    try {
      const u = new URL(url)
      if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v')
        if (v) return `https://www.youtube.com/embed/${v}`
        if (u.pathname.startsWith('/embed/')) return url
      }
      return null
    } catch { return null }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userInfo || !contest) return

    // Open the rules instead of submitting, rather than failing silently.
    if (!acknowledged) {
      setRulesOpen(true)
      return
    }

    if (!entrantRole) {
      setStatus('error')
      setMessage('Please select your role in this film.')
      return
    }
    const phone = entrantPhone.replace(/[^0-9]/g, '')
    if (phone.length !== 10) {
      setStatus('error')
      setMessage('Please enter a valid 10-digit mobile number — we need it to reach you about your entry and any prize.')
      return
    }

    setStatus('loading')
    setMessage('')

    let targetFilmId = filmId

    if (!filmId && youtubeUrl) {
      const embedUrl = toEmbedUrl(youtubeUrl)
      if (!embedUrl) {
        setStatus('error')
        setMessage('Please enter a valid YouTube URL.')
        return
      }

      if (!districtId) {
        setStatus('error')
        setMessage('Please select your district.')
        return
      }

      const { data: newFilm, error: filmError } = await supabase
        .from('films')
        .insert({
          title_en:    newTitle || 'Contest Film',
          genre:       newGenre,
          video_url:   embedUrl,
          creator_id:  userInfo.id,
          district_id: districtId,
          status:      'pending',
          view_count:  0,
          like_count:  0,
        })
        .select('id')
        .single()

      if (filmError || !newFilm) {
        setStatus('error')
        setMessage(`Could not create film: ${filmError?.message ?? 'Unknown error'}`)
        return
      }
      targetFilmId = newFilm.id

      // Alert every admin that a new film is waiting for review (non-blocking).
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/admin/notify', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ type: 'film_pending', filmId: targetFilmId }),
        })
      } catch (notifyErr) {
        console.error('Admin notify failed:', notifyErr)
      }
    }

    if (!targetFilmId) {
      setStatus('error')
      setMessage('Please select a film or paste a YouTube URL.')
      return
    }

    // ← CHANGED: also return 'id' from insert so we can pass to CashfreeButton
    const { data: newEntry, error } = await supabase
      .from('contest_entries')
      .insert({
        contest_id:     contest.id,
        film_id:        targetFilmId,
        creator_id:     userInfo.id,
        payment_status: 'pending',
        is_approved:    false,
        entrant_role:   entrantRole,
        entrant_credit: entrantCredit.trim() || null,
        entrant_phone:  phone,
      })
      .select('id')
      .single()

    if (error) {
      setStatus('error')
      setMessage(error.code === '23505'
        ? 'You have already entered this contest. Only one film per filmmaker is allowed.'
        : `Submission failed: ${error.message}`)
      return
    }

    setSubmittedFilmId(targetFilmId)
    // `||` not `??`: trim() always returns a string, so `??` would never fall
    // through to the empty default.
    setSubmittedFilmTitle(
      myFilms.find(f => f.id === targetFilmId)?.title_en || newTitle.trim() || '',
    )
    setSubmittedEntryId(newEntry.id) // ← NEW: save entry row ID
    setStatus('submitted')
    setMessage('Film submitted! Complete payment to confirm your entry.')
  }

  // ── SCREEN: Not logged in ─────────────────────────────────
  if (!userInfo) return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">🔐</div>
      <p className="text-[color:var(--text)] font-semibold mb-2">Login Required</p>
      <p className="text-[color:var(--muted)] text-sm mb-6">You need to be logged in to enter the contest.</p>
      <button onClick={() => router.push('/auth')}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-wide text-sm">
        Login / Create Account
      </button>
    </div>
  )

  // ── SCREEN: season exists but is not accepting entries ────
  // Each phase says what is true and where to go, instead of pretending no
  // contest exists.
  if (contest && contest.status !== 'open') {
    const opensOn = contest.submissions_open_at
      ? new Date(contest.submissions_open_at).toLocaleDateString('en-US',
          { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })
      : null

    const phase = contest.status === 'voting'
      ? {
          icon: '🗳️',
          title: 'Submissions are closed — voting is live',
          body: `Season ${contest.season_number ?? ''} has moved to the voting round, so new films can no longer be entered. Watch the entries and cast your vote instead.`,
          cta: { href: '/contest', label: 'Go vote now →' },
        }
      : contest.status === 'upcoming'
      ? {
          icon: '⏳',
          title: opensOn ? `Entries open ${opensOn}` : 'Entries open soon',
          body: `Season ${contest.season_number ?? ''} has not started yet. Nothing to submit today — we will announce it the moment entries open.`,
          cta: { href: '/contest', label: 'See the prizes →' },
        }
      : {
          icon: '🏛️',
          title: 'This season has ended',
          body: 'Entries are closed for this season. Take a look at who won.',
          cta: { href: '/contest/winners', label: 'View Hall of Fame →' },
        }

    return (
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">{phase.icon}</div>
        <p className="text-[color:var(--text)] font-bold text-lg mb-2">{phase.title}</p>
        <p className="text-[color:var(--muted)] text-sm mb-6 max-w-md mx-auto leading-relaxed">{phase.body}</p>
        <button onClick={() => router.push(phase.cta.href)}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide text-sm hover:opacity-90 transition">
          {phase.cta.label}
        </button>
      </div>
    )
  }

  // ── SCREEN: No active contest ─────────────────────────────
  if (!contest) return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">⏳</div>
      <p className="text-[color:var(--text)] font-semibold mb-2">No Active Contest</p>
      <p className="text-[color:var(--muted)] text-sm">Check back soon for the next contest!</p>
    </div>
  )

  // ── SCREEN: Already entered ───────────────────────────────
  if (alreadyEntered) return (
    <div className="bg-[color:var(--surface)] border border-green-700/30 rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">✅</div>
      <p className="text-green-400 font-semibold mb-2">You&apos;ve Already Entered!</p>
      <p className="text-[color:var(--muted)] text-sm mb-6">Your film is in the contest. Share it to get more votes!</p>
      <button onClick={() => router.push('/contest')}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase text-sm">
        View Leaderboard →
      </button>
    </div>
  )

  // ── SCREEN: Film submitted → show UPI payment ──────────
  if (status === 'submitted') return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎬</div>
        <p className="text-green-400 font-bold text-lg mb-2">Film Submitted!</p>
        <p className="text-[color:var(--muted)] text-sm">{message}</p>

        {/* Name the film being paid for — the screen used to give no clue
            which film the entry was actually for. */}
        {submittedFilmId && (
          <p className="text-[color:var(--text)] text-sm mt-3">
            Entering:{' '}
            <b>{submittedFilmTitle || myFilms.find(f => f.id === submittedFilmId)?.title_en || 'your film'}</b>
          </p>
        )}

        <button
          onClick={changeFilm}
          disabled={cancelling}
          className="mt-3 text-xs text-[color:var(--muted)] underline hover:text-[color:var(--accent)] transition disabled:opacity-50"
        >
          {cancelling ? 'Discarding…' : 'Wrong film? Choose a different one'}
        </button>
      </div>

      <UPIPayment
        contestEntryId={submittedEntryId}
        entryFee={contest.entry_fee}
        onSuccess={() => setStatus('paid')}
        onError={(msg) => { setStatus('error'); setMessage(msg) }}
      />
    </div>
  )

  // ── SCREEN: Payment complete ──────────────────────────────
  if (status === 'paid') return (
    <div className="bg-[color:var(--surface)] border border-green-700/30 rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <p className="text-green-400 font-bold text-xl mb-2">Payment submitted — nothing more to do</p>
      {submittedFilmTitle && (
        <p className="text-[color:var(--text)] text-sm mb-1">
          Your entry: <b>{submittedFilmTitle}</b>
        </p>
      )}
      <p className="text-[color:var(--text)] text-sm mb-1">We have received your payment reference.</p>
      <p className="text-[color:var(--muted)] text-sm mb-6">
        An admin will verify it and approve your entry within 24 hours. You do <b>not</b> need to pay
        again — if you reload this page you will land right back here until it is approved.
      </p>
      <button onClick={() => router.push('/contest')}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-lg font-bold uppercase text-sm">
        View Leaderboard →
      </button>
    </div>
  )

  // ── SCREEN: Main entry form ───────────────────────────────
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-8">
      <div className="mb-6 p-4 bg-[#D4A017]/05 border border-[color:var(--accent)]/20 rounded-xl">
        <p className="text-sm text-[color:var(--accent)] font-semibold mb-0.5">{contest.title}</p>
        <p className="text-xs text-[color:var(--muted)]">
          Entry Fee: ₹{contest.entry_fee} · Prize Pool: ₹{(contest.prize_1st + contest.prize_2nd + contest.prize_3rd).toLocaleString('en-IN')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {myFilms.length > 0 && (
          <div>
            <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
              Select Your Film (already uploaded)
            </label>
            <select value={filmId} onChange={e => setFilmId(e.target.value)}
              className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition">
              <option value="">— Choose a film —</option>
              {myFilms.map(f => <option key={f.id} value={f.id}>{f.title_en}</option>)}
            </select>
          </div>
        )}

        {!filmId && (
          <>
            {myFilms.length > 0 && (
              <div className="text-center text-xs text-[color:var(--muted)] py-1">— or submit a new film —</div>
            )}
            <div>
              <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
                Your District *
              </label>
              <select
                value={districtId}
                onChange={e => setDistrictId(e.target.value)}
                required={!filmId}
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
              >
                <option value="">— Select your district —</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Film Title *</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Your film title" required={!filmId}
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition" />
            </div>
            <div>
              <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Genre *</label>
              <select value={newGenre} onChange={e => setNewGenre(e.target.value)}
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition">
                {['Drama','Comedy','Thriller','Documentary','Family','Romance','RomCom','Action','Experimental'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">YouTube URL *</label>
              <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://youtu.be/your-film-id" required={!filmId}
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition" />
              <p className="text-xs text-[color:var(--faint)] mt-1">Upload to YouTube as Unlisted, paste the link here.</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-300 rounded-lg px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Authorship declaration + contact. Required: these are what make the
            "it must be your own work" rule reviewable, and the phone number is
            how you reach a winner to pay them. */}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 space-y-4">
          <div>
            <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
              Your role in this film *
            </label>
            <select
              value={entrantRole}
              onChange={e => { setEntrantRole(e.target.value); setMessage('') }}
              className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
            >
              <option value="">Select your role…</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-[11px] text-[color:var(--faint)] mt-1">
              You must have contributed to the film to enter it.
            </p>
          </div>

          <div>
            <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
              Credit line (optional)
            </label>
            <input
              type="text"
              value={entrantCredit}
              onChange={e => setEntrantCredit(e.target.value)}
              placeholder="e.g. Directed by Ravi Kumar · DOP Anil"
              maxLength={160}
              className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
              Mobile number *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[color:var(--muted)] text-sm shrink-0">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                value={entrantPhone}
                onChange={e => { setEntrantPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10)); setMessage('') }}
                placeholder="10-digit mobile number"
                className="w-full bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
              />
            </div>
            <p className="text-[11px] text-[color:var(--faint)] mt-1">
              Used only to contact you about your entry and to pay out if you win. Not shown publicly.
            </p>
          </div>
        </div>

        {/* Rules gate. Reads as a confirmation once done, so the entrant can
            see the state rather than wondering why submit did nothing. */}
        <div className={`rounded-xl border p-3.5 ${
          acknowledged
            ? 'border-[color:var(--accent)]/40 bg-[#D4A017]/8'
            : 'border-[color:var(--border)] bg-[color:var(--bg)]'
        }`}>
          {acknowledged ? (
            <p className="text-[13px] text-[color:var(--accent)] font-semibold flex items-center gap-2">
              <span aria-hidden>✓</span> Rules acknowledged — you can submit your film.
              <button type="button" onClick={() => setRulesOpen(true)}
                className="ml-auto text-[11px] text-[color:var(--muted)] underline hover:text-[color:var(--text)]">
                Read again
              </button>
            </p>
          ) : (
            <>
              <p className="text-[13px] text-[color:var(--muted)] leading-relaxed mb-2.5">
                Before you enter, please read the contest rules — including that the film must be your
                own work and that the entry fee is non-refundable.
              </p>
              <button type="button" onClick={() => setRulesOpen(true)}
                className="w-full border border-[color:var(--accent)]/45 text-[color:var(--accent)] py-2.5 rounded-lg font-bold uppercase tracking-wide text-xs hover:bg-[#D4A017]/10 transition">
                📋 Read &amp; acknowledge the rules
              </button>
            </>
          )}
        </div>

        <button type="submit" disabled={status === 'loading' || !acknowledged}
          title={!acknowledged ? 'Please read and acknowledge the contest rules first' : ''}
          className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3.5 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          {status === 'loading' ? '⏳ Submitting...' : acknowledged ? `Submit Film →` : 'Acknowledge the rules to continue'}
        </button>

        <ContestRulesModal
          contest={contest}
          mode="acknowledge"
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          onAccept={recordAcknowledgement}
        />

        <p className="text-center text-xs text-[color:var(--faint)]">
          By entering, you confirm this is your original work.
        </p>
      </form>
    </div>
  )
}