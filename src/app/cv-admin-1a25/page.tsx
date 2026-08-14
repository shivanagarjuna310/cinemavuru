'use client'
// src/app/cv-admin-1a25/page.tsx — with contest entry management + close contest

import { useState, useEffect, useCallback } from 'react'
import { supabase }        from '@/lib/supabase'
import ErrorLogViewer      from '@/components/ErrorLogViewer'

type Film = {
  id: string; title_en: string; title_te: string | null
  genre: string | null; video_url: string | null
  description: string | null; status: string
  created_at: string; like_count: number; view_count: number
  creator_id: string
  contest_entries?: { payment_status: string; payment_ref: string | null }[]
}
type Log = {
  id: string; event_type: string; created_at: string
  metadata: Record<string, string>
  profiles: { name: string | null } | null
  films:    { title_en: string | null } | null
}
type ContestEntry = {
  id: string
  creator_id: string
  payment_status: string
  is_approved: boolean
  contest_score: number
  created_at: string
  razorpay_payment_id: string | null
  payment_ref: string | null
  films: { id: string; title_en: string } | null
  profiles: { name: string | null } | null
}
type Contest = {
  id: string
  title: string
  status: string
  season_number: number
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  winner_film_id: string | null
  winner_2nd_film_id: string | null
  winner_3rd_film_id: string | null
  min_votes: number
}

type AccessState = 'checking' | 'denied' | 'granted'
type MainTab = 'films' | 'activity' | 'errors' | 'contest'
type FilmFilter = 'pending' | 'active' | 'rejected'

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

function formatPrize(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function filmThumb(url: string | null) {
  const id = url?.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

type Toast = { msg: string; type: 'success' | 'error' }

const EVENT_STYLE: Record<string, { color: string; label: string }> = {
  film_uploaded:   { color: 'text-blue-400',   label: '📤 Uploaded'   },
  film_approved:   { color: 'text-green-400',  label: '✅ Approved'   },
  film_rejected:   { color: 'text-red-400',    label: '❌ Rejected'   },
  user_registered: { color: 'text-[color:var(--accent)]',  label: '👤 Registered' },
  system_cleanup:  { color: 'text-[color:var(--muted)]',  label: '🗑 Cleanup'    },
}

export default function AdminPage() {
  const [access,     setAccess]     = useState<AccessState>('checking')
  const [mainTab,    setMainTab]    = useState<MainTab>('films')
  const [filmFilter, setFilmFilter] = useState<FilmFilter>('pending')
  const [films,      setFilms]      = useState<Film[]>([])
  const [filmSearch,  setFilmSearch]  = useState('')
  const [genreFilter, setGenreFilter] = useState('all')
  const [entrySearch, setEntrySearch] = useState('')
  const [entryFilter, setEntryFilter] = useState<'all' | 'paid' | 'unpaid' | 'approved' | 'pending'>('all')
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [activitySearch, setActivitySearch] = useState('')
  const [activityType,   setActivityType]   = useState('all')
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; confirmLabel: string; onConfirm: () => void } | null>(null)
  const [logs,       setLogs]       = useState<Log[]>([])
  const [loading,    setLoading]    = useState(false)
  const [stats,      setStats]      = useState({ pending: 0, active: 0, users: 0, views: 0, errors: 0 })
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [contestEntries, setContestEntries] = useState<ContestEntry[]>([])
  const [contestLoading, setContestLoading] = useState(false)
  const [activeContest,  setActiveContest]  = useState<Contest | null>(null)
  // ── Close contest state ──────────────────────────────────
  const [showClosePanel, setShowClosePanel] = useState(false)
  const [winner1, setWinner1] = useState('')
  const [winner2, setWinner2] = useState('')
  const [winner3, setWinner3] = useState('')
  const [closing, setClosing] = useState(false)
  // ── Create contest state ─────────────────────────────────
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [newContestTitle, setNewContestTitle] = useState('')
  const [newSeasonNumber, setNewSeasonNumber] = useState(1)
  const [newEntryFee,     setNewEntryFee]     = useState(299)
  const [newPrize1,       setNewPrize1]       = useState(5000)
  const [newPrize2,       setNewPrize2]       = useState(3000)
  const [newPrize3,       setNewPrize3]       = useState(2000)
  const [newSubsCloseAt,  setNewSubsCloseAt]  = useState('')
  const [creating,        setCreating]        = useState(false)
  const [newMinVotes,     setNewMinVotes]     = useState(100)
  const [toast,           setToast]           = useState<Toast | null>(null)

  function showToast(msg: string, type: Toast['type'] = 'success') {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAccess('denied'); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setAccess(data?.role === 'admin' ? 'granted' : 'denied')
    }
    checkAccess()
  }, [])

  const loadStats = useCallback(async () => {
    const [pending, active, users, views, errors] = await Promise.all([
      supabase.from('films').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('films').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('films').select('view_count').eq('status', 'active'),
      supabase.from('error_logs').select('id', { count: 'exact', head: true }).in('level', ['error', 'critical']),
    ])
    setStats({
      pending: pending.count ?? 0,
      active:  active.count  ?? 0,
      users:   users.count   ?? 0,
      views:   views.data?.reduce((s, f) => s + (f.view_count || 0), 0) ?? 0,
      errors:  errors.count  ?? 0,
    })
  }, [])

  const fetchFilms = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('films')
      .select('*, contest_entries(payment_status, payment_ref)')
      .eq('status', filmFilter)
      .order('created_at', { ascending: false })
    setFilms(data ?? [])
    setLoading(false)
  }, [filmFilter])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('logs').select('*, profiles(name), films(title_en)').order('created_at', { ascending: false }).limit(100)
    setLogs((data as Log[]) ?? [])
    setLoading(false)
  }, [])

  const fetchContestEntries = useCallback(async () => {
    setContestLoading(true)
    // Fetch active contest
    const { data: contest } = await supabase
      .from('contests')
      .select('*')
      .in('status', ['open', 'voting'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setActiveContest(contest ?? null)

    // Fetch entries for active contest only
    if (!contest) { setContestLoading(false); return }
    const { data } = await supabase
      .from('contest_entries')
      .select('*, films(id, title_en, status), profiles!contest_entries_creator_id_fkey(name)')
      .eq('contest_id', contest.id)
      .order('contest_score', { ascending: false })
    setContestEntries((data as ContestEntry[]) ?? [])
    setContestLoading(false)
  }, [])

  useEffect(() => {
    if (access !== 'granted') return
    loadStats()
    if (mainTab === 'films')    fetchFilms()
    if (mainTab === 'activity') fetchLogs()
    if (mainTab === 'contest')  fetchContestEntries()
  }, [access, mainTab, filmFilter, loadStats, fetchFilms, fetchLogs, fetchContestEntries])

  async function updateFilmStatus(filmId: string, newStatus: 'active' | 'rejected') {
    const { error } = await supabase.from('films').update({ status: newStatus }).eq('id', filmId)
    if (error) { showToast(`Error: ${error.message}`, 'error'); return }

    try {
      const film = films.find(f => f.id === filmId)
      if (film) {
        const { data: profile } = await supabase
          .from('profiles').select('name').eq('id', film.creator_id).single()
        const emailRes = await fetch('/api/email/creator-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: film.creator_id }),
        })
        const { email: creatorEmail } = await emailRes.json()
        await fetch('/api/email/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:         newStatus === 'active' ? 'film_approved' : 'film_rejected',
            filmTitle:    film.title_en,
            creatorName:  profile?.name  ?? 'Filmmaker',
            creatorEmail: creatorEmail   ?? '',
          }),
        })
      }
    } catch (emailErr) {
      console.error('Creator email notify failed:', emailErr)
    }

    setFilms(prev => prev.filter(f => f.id !== filmId))
    loadStats()
    showToast(newStatus === 'active' ? '✅ Film approved & creator notified' : '❌ Film rejected')
  }

  async function updateContestEntry(entryId: string, isApproved: boolean) {
    const { error } = await supabase
      .from('contest_entries').update({ is_approved: isApproved }).eq('id', entryId)
    if (error) { showToast(`Error: ${error.message}`, 'error'); return }
    setContestEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, is_approved: isApproved } : e
    ))
  }

  // ── Approve contest entry + film on main feed in one click ──
  async function approveForContestAndFeed(entryId: string, filmId: string) {
    // 1. Approve contest entry
    const { error: entryError } = await supabase
      .from('contest_entries').update({ is_approved: true }).eq('id', entryId)
    if (entryError) { showToast(`Error approving entry: ${entryError.message}`, 'error'); return }

    // 2. Approve film on main feed
    const { error: filmError } = await supabase
      .from('films').update({ status: 'active' }).eq('id', filmId)
    if (filmError) { showToast(`Error approving film: ${filmError.message}`, 'error'); return }

    // 3. Update local state
    setContestEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, is_approved: true } : e
    ))
    showToast('✅ Approved for contest & published to feed')
  }

  async function closeContest() {
    if (!activeContest) return
    if (!winner1) { showToast('Please select at least the 1st place winner.', 'error'); return }

    // ── Minimum vote threshold check ─────────────────────────
    const MIN_VOTES = activeContest.min_votes
    const winnerEntry = approvedEntries.find(e => e.films?.id === winner1)
    if (winnerEntry && winnerEntry.contest_score < MIN_VOTES) {
      const proceed = window.confirm(
        `⚠️ MINIMUM VOTE THRESHOLD NOT MET!\n\n` +
        `The 1st place film "${winnerEntry.films?.title_en}" only has ${winnerEntry.contest_score} votes.\n` +
        `Minimum required: ${MIN_VOTES} votes to be eligible for prize money.\n\n` +
        `You can still close the contest, but prize money should NOT be paid out this season.\n\n` +
        `Close anyway (without prize money)?`
      )
      if (!proceed) return
    }

    const confirmed = window.confirm(
      `⚠️ Close Season ${activeContest.season_number} — "${activeContest.title}"?\n\nThis will:\n• Mark the contest as closed\n• Save the top 3 winners to Hall of Fame\n• Cannot be undone!\n\nProceed?`
    )
    if (!confirmed) return

    setClosing(true)

    const { error } = await supabase
      .from('contests')
      .update({
        status:             'closed',
        ended_at:           new Date().toISOString(),
        winner_film_id:     winner1 || null,
        winner_2nd_film_id: winner2 || null,
        winner_3rd_film_id: winner3 || null,
      })
      .eq('id', activeContest.id)

    if (error) {
      showToast(`Error closing contest: ${error.message}`, 'error')
      setClosing(false)
      return
    }

    setClosing(false)
    setShowClosePanel(false)
    setActiveContest(null)
    showToast(`✅ Season ${activeContest.season_number} closed! Winners saved to Hall of Fame.`)
    fetchContestEntries()
  }
  async function createContest() {
    if (!newContestTitle.trim()) { showToast('Please enter a contest title.', 'error'); return }
    if (!newSubsCloseAt)         { showToast('Please set a submissions close date.', 'error'); return }

    setCreating(true)
    const { error } = await supabase.from('contests').insert({
      title:                newContestTitle.trim(),
      season_number:        newSeasonNumber,
      entry_fee:            newEntryFee,
      prize_1st:            newPrize1,
      prize_2nd:            newPrize2,
      prize_3rd:            newPrize3,
      submissions_close_at: new Date(newSubsCloseAt).toISOString(),
      status:               'open',
      min_votes:            newMinVotes,
    })

    if (error) {
      showToast(`Error creating contest: ${error.message}`, 'error')
      setCreating(false)
      return
    }

    setCreating(false)
    setShowCreatePanel(false)
    setNewContestTitle('')
    showToast(`✅ Season ${newSeasonNumber} created and is now LIVE!`)
    fetchContestEntries()
  }
  // ── Delete (single) — opens the confirmation modal ──
  function deleteFilm(film: Film) {
    setConfirmModal({
      title: 'Delete film permanently?',
      message: `"${film.title_en}"\n\nThis also removes its likes, comments and views. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => doDeleteFilm(film.id),
    })
  }

  async function doDeleteFilm(id: string) {
    setDeleting(id)
    await supabase.from('likes').delete().eq('film_id', id)
    await supabase.from('comments').delete().eq('film_id', id)
    await supabase.from('film_views').delete().eq('film_id', id)
    await supabase.from('contest_entries').delete().eq('film_id', id)
    const { error: filmErr } = await supabase.from('films').delete().eq('id', id)
    if (filmErr) { showToast(`Delete failed: ${filmErr.message}`, 'error'); setDeleting(null); return }
    setFilms(prev => prev.filter(f => f.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    loadStats()
    setDeleting(null)
    showToast('🗑 Film permanently deleted')
  }

  // ── Multi-select + bulk actions ──
  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function clearSelection() { setSelected(new Set()) }

  async function bulkSetStatus(newStatus: 'active' | 'rejected') {
    const ids = [...selected]
    if (!ids.length) return
    const { error } = await supabase.from('films').update({ status: newStatus }).in('id', ids)
    if (error) { showToast(`Error: ${error.message}`, 'error'); return }
    setFilms(prev => prev.filter(f => !selected.has(f.id)))
    clearSelection()
    loadStats()
    showToast(`${ids.length} film${ids.length > 1 ? 's' : ''} ${newStatus === 'active' ? 'approved' : 'rejected'}`)
  }

  function bulkDelete() {
    const ids = [...selected]
    if (!ids.length) return
    setConfirmModal({
      title: `Delete ${ids.length} film${ids.length > 1 ? 's' : ''} permanently?`,
      message: 'This also removes their likes, comments and views. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
      onConfirm: () => doBulkDelete(ids),
    })
  }
  async function doBulkDelete(ids: string[]) {
    await supabase.from('likes').delete().in('film_id', ids)
    await supabase.from('comments').delete().in('film_id', ids)
    await supabase.from('film_views').delete().in('film_id', ids)
    await supabase.from('contest_entries').delete().in('film_id', ids)
    const { error } = await supabase.from('films').delete().in('id', ids)
    if (error) { showToast(`Delete failed: ${error.message}`, 'error'); return }
    setFilms(prev => prev.filter(f => !ids.includes(f.id)))
    clearSelection()
    loadStats()
    showToast(`🗑 ${ids.length} film${ids.length > 1 ? 's' : ''} deleted`)
  }

  if (access === 'checking') return (
    <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center text-[color:var(--muted)]">Checking...</div>
  )

  if (access === 'denied') return (
    <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center text-[color:var(--text)]">
      <div className="text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-[color:var(--accent-hot)] mb-2">Access Denied</h1>
        <a href="/" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase text-sm">Go Home</a>
      </div>
    </div>
  )

  // Approved entries sorted by score — for winner dropdowns
  const approvedEntries = contestEntries.filter(e => e.is_approved && e.payment_status === 'paid')

  // ── Client-side filters (data is already fetched, so filtering is instant) ──
  const genres = Array.from(new Set(films.map(f => f.genre).filter(Boolean))) as string[]
  const fq = filmSearch.trim().toLowerCase()
  const visibleFilms = films.filter(f => {
    const matchGenre = genreFilter === 'all' || f.genre === genreFilter
    const matchSearch = !fq
      || f.title_en?.toLowerCase().includes(fq)
      || f.title_te?.toLowerCase().includes(fq)
    return matchGenre && matchSearch
  })

  const aq = activitySearch.trim().toLowerCase()
  const visibleLogs = logs.filter(l => {
    const matchType = activityType === 'all' || l.event_type === activityType
    const text = `${l.films?.title_en ?? ''} ${l.metadata?.title ?? ''} ${l.metadata?.name ?? ''} ${l.profiles?.name ?? ''}`.toLowerCase()
    const matchSearch = !aq || text.includes(aq)
    return matchType && matchSearch
  })

  const eq = entrySearch.trim().toLowerCase()
  const visibleEntries = contestEntries.filter(e => {
    const matchStatus =
      entryFilter === 'all'      ? true :
      entryFilter === 'paid'     ? e.payment_status === 'paid' :
      entryFilter === 'unpaid'   ? e.payment_status !== 'paid' :
      entryFilter === 'approved' ? e.is_approved :
      entryFilter === 'pending'  ? !e.is_approved : true
    const matchSearch = !eq
      || e.films?.title_en?.toLowerCase().includes(eq)
      || e.profiles?.name?.toLowerCase().includes(eq)
    return matchStatus && matchSearch
  })

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">

      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 anim-pop flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmModal(null)}>
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl anim-pop"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-lg shrink-0">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-[color:var(--text)]">{confirmModal.title}</h3>
                <p className="text-sm text-[color:var(--muted)] whitespace-pre-line mt-1 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--text)] transition">
                Cancel
              </button>
              <button onClick={() => { const cb = confirmModal.onConfirm; setConfirmModal(null); cb() }}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition">
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-[color:var(--bg)]/85 backdrop-blur-md border-b border-[color:var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black text-lg shrink-0">🎬</div>
            <div className="leading-none min-w-0">
              <h1 className="text-base font-bold text-[color:var(--text)] truncate">CinemaVuru Admin</h1>
              <p className="text-[color:var(--muted)] text-[11px] mt-1">Platform management</p>
            </div>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-[#D4A017]/15 text-[color:var(--accent)] px-2 py-0.5 rounded-full border border-[color:var(--accent)]/30 shrink-0">Admin</span>
          </div>
          <a href="/" className="text-[color:var(--muted)] hover:text-[color:var(--accent)] text-sm transition shrink-0">← Back to site</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Pending review', value: stats.pending, icon: '⏳', color: 'text-[color:var(--accent-hot)]' },
            { label: 'Live films',     value: stats.active,  icon: '🎬', color: 'text-green-400'  },
            { label: 'Users',          value: stats.users,   icon: '👥', color: 'text-[color:var(--accent)]'  },
            { label: 'Total views',    value: stats.views >= 1000 ? `${(stats.views/1000).toFixed(1)}K` : stats.views, icon: '👁', color: 'text-blue-400' },
            { label: 'Errors',         value: stats.errors,  icon: '🐛', color: stats.errors > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 hover:border-[color:var(--accent)]/30 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base opacity-80">{s.icon}</span>
                <span className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</span>
              </div>
              <div className="text-[11px] text-[color:var(--muted)] uppercase tracking-wide mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-20 -mx-6 px-6 py-3 mb-5 bg-[color:var(--bg)]/95 backdrop-blur border-b border-[color:var(--border)] flex gap-2 flex-wrap">
          {([
            { key: 'films',    label: '🎬 Films'    },
            { key: 'activity', label: '📋 Activity' },
            { key: 'errors',   label: `🐛 Errors${stats.errors > 0 ? ` (${stats.errors})` : ''}` },
            { key: 'contest',  label: '🏆 Contest'  },
          ] as { key: MainTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition ${mainTab === t.key ? 'bg-[#D4A017]/20 text-[color:var(--accent)] border border-[color:var(--accent)]/40' : 'bg-[color:var(--surface)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => {
            loadStats()
            if (mainTab === 'films')    fetchFilms()
            else if (mainTab === 'activity') fetchLogs()
            else if (mainTab === 'contest')  fetchContestEntries()
          }} className="ml-auto px-4 py-2 rounded-lg text-sm border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--accent)] transition">
            ↻ Refresh
          </button>
        </div>

        {/* FILMS TAB */}
        {mainTab === 'films' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex gap-2">
                {(['pending','active','rejected'] as FilmFilter[]).map(s => (
                  <button key={s} onClick={() => { setFilmFilter(s); clearSelection() }}
                    className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition capitalize ${filmFilter === s ? 'bg-[#D4A017]/15 text-[color:var(--accent)] border border-[color:var(--accent)]/30' : 'text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
                    {s} {filmFilter === s && `(${films.length})`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <input
                  type="text"
                  value={filmSearch}
                  onChange={e => setFilmSearch(e.target.value)}
                  placeholder="🔍 Search title..."
                  className="flex-1 sm:w-56 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-1.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                />
                <select
                  value={genreFilter}
                  onChange={e => setGenreFilter(e.target.value)}
                  className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-1.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition">
                  <option value="all">All genres</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Bulk action bar */}
            {!loading && visibleFilms.length > 0 && (
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[color:var(--muted)] select-none">
                  <input type="checkbox"
                    checked={visibleFilms.length > 0 && visibleFilms.every(f => selected.has(f.id))}
                    onChange={e => setSelected(prev => {
                      const n = new Set(prev)
                      if (e.target.checked) visibleFilms.forEach(f => n.add(f.id))
                      else visibleFilms.forEach(f => n.delete(f.id))
                      return n
                    })}
                    className="w-4 h-4 accent-[#D4A017] cursor-pointer" />
                  Select all ({visibleFilms.length})
                </label>
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-xs font-bold text-[color:var(--accent)]">{selected.size} selected</span>
                    {filmFilter !== 'active' && (
                      <button onClick={() => bulkSetStatus('active')} className="bg-green-700/80 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition">✅ Approve</button>
                    )}
                    {filmFilter !== 'rejected' && (
                      <button onClick={() => bulkSetStatus('rejected')} className="bg-red-900/60 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded text-xs font-bold uppercase transition">❌ Reject</button>
                    )}
                    <button onClick={bulkDelete} className="border border-red-900/60 text-red-500 hover:bg-red-900/30 px-3 py-1.5 rounded text-xs font-bold uppercase transition">🗑 Delete</button>
                    <button onClick={clearSelection} className="text-[color:var(--muted)] hover:text-[color:var(--text)] px-2 py-1.5 rounded text-xs transition">Clear</button>
                  </div>
                )}
              </div>
            )}
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => (
                  <div key={i} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 flex items-start gap-4 animate-pulse">
                    <div className="w-28 sm:w-44 aspect-video rounded-lg bg-[color:var(--border)] shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-1/2 bg-[color:var(--border)] rounded" />
                      <div className="h-3 w-1/3 bg-[color:var(--border)] rounded" />
                      <div className="h-3 w-2/3 bg-[color:var(--border)] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )
            : films.length === 0 ? (
              <div className="text-center py-16 text-[color:var(--muted)]"><div className="text-4xl mb-2">✅</div><p>No {filmFilter} films</p></div>
            ) : visibleFilms.length === 0 ? (
              <div className="text-center py-16 text-[color:var(--muted)]"><div className="text-4xl mb-2">🔍</div><p>No films match your filters</p></div>
            ) : (
              <div className="space-y-3">
                {visibleFilms.map(film => {
                  const thumb = filmThumb(film.video_url)
                  const watch = film.video_url ? film.video_url.replace('/embed/','/watch?v=') : '#'
                  return (
                  <div key={film.id} className={`bg-[color:var(--surface)] border rounded-xl p-4 transition-colors ${selected.has(film.id) ? 'border-[color:var(--accent)]/60 ring-1 ring-[color:var(--accent)]/30' : 'border-[color:var(--border)] hover:border-[color:var(--accent)]/30'}`}>
                    <div className="flex items-start gap-4">
                      {/* Select for bulk actions */}
                      <input type="checkbox"
                        checked={selected.has(film.id)}
                        onChange={() => toggleSelect(film.id)}
                        aria-label={`Select ${film.title_en}`}
                        className="mt-1 w-4 h-4 accent-[#D4A017] cursor-pointer shrink-0" />
                      {/* Thumbnail — click to preview on YouTube */}
                      <a href={watch} target="_blank" rel="noopener noreferrer"
                        className="relative w-28 sm:w-44 aspect-video rounded-lg overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)] shrink-0 group">
                        {thumb
                          ? <img src={thumb} alt={film.title_en} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold">
                          ▶ Preview
                        </div>
                      </a>

                      <div className="flex-1 min-w-0 flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[color:var(--text)] mb-1 truncate">{film.title_en}</h3>
                          {film.title_te && <p className="text-[color:var(--muted)] text-sm mb-1 truncate">{film.title_te}</p>}
                          <div className="flex gap-2 text-xs text-[color:var(--muted)] flex-wrap">
                            <span className="bg-[color:var(--border)] px-2 py-0.5 rounded">{film.genre}</span>
                            <span>{timeAgo(film.created_at)}</span>
                            <span>👁 {film.view_count}</span>
                            <span>♥ {film.like_count}</span>
                            {film.contest_entries && film.contest_entries.length > 0 && (
                              <span className="bg-[#D4A017]/20 border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-2 py-0.5 rounded font-bold">🏆 Contest</span>
                            )}
                            {film.contest_entries?.[0]?.payment_ref && (
                              <span className="bg-green-900/30 border border-green-700/40 text-green-400 px-2 py-0.5 rounded">UTR: {film.contest_entries[0].payment_ref}</span>
                            )}
                            {film.contest_entries?.[0]?.payment_status === 'pending_verification' && (
                              <span className="bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-2 py-0.5 rounded">⏳ Payment Pending Verify</span>
                            )}
                            {film.contest_entries?.[0]?.payment_status === 'paid' && (
                              <span className="bg-green-900/30 border border-green-700/40 text-green-400 px-2 py-0.5 rounded">✅ Payment Verified</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {filmFilter === 'pending' && <>
                            <button onClick={() => updateFilmStatus(film.id,'active')} className="bg-green-700/80 hover:bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase transition">✅ Approve</button>
                            <button onClick={() => updateFilmStatus(film.id,'rejected')} className="bg-red-900/60 hover:bg-red-800 text-red-300 px-4 py-1.5 rounded text-xs font-bold uppercase transition">❌ Reject</button>
                          </>}
                          {filmFilter === 'rejected' && (
                            <button onClick={() => updateFilmStatus(film.id,'active')} className="border border-green-700/40 text-green-400 px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-green-700/20 transition">↩ Approve</button>
                          )}
                          {filmFilter === 'active' && (
                            <button onClick={() => updateFilmStatus(film.id,'rejected')} className="border border-red-700/40 text-red-400 px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-red-700/20 transition">Hide</button>
                          )}
                          <button onClick={() => deleteFilm(film)} disabled={deleting === film.id}
                            className="border border-red-900/60 text-red-600 hover:bg-red-900/30 hover:text-red-400 px-4 py-1.5 rounded text-xs font-bold uppercase transition disabled:opacity-40">
                            {deleting === film.id ? '⏳ Deleting...' : '🗑 Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ACTIVITY TAB */}
        {mainTab === 'activity' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <p className="text-xs text-[color:var(--muted)]">Last 100 business events</p>
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <input
                  type="text"
                  value={activitySearch}
                  onChange={e => setActivitySearch(e.target.value)}
                  placeholder="🔍 Search..."
                  className="flex-1 sm:w-48 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-1.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                />
                <select
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                  className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-1.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition">
                  <option value="all">All events</option>
                  {Object.entries(EVENT_STYLE).map(([key, v]) => (
                    <option key={key} value={key}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? <div className="text-center py-16 text-[color:var(--muted)]">Loading...</div>
            : logs.length === 0 ? <div className="text-center py-16 text-[color:var(--muted)]"><p className="text-3xl mb-2">📋</p><p className="text-sm">No activity yet</p></div>
            : visibleLogs.length === 0 ? <div className="text-center py-16 text-[color:var(--muted)]"><p className="text-3xl mb-2">🔍</p><p className="text-sm">No events match your filters</p></div>
            : (
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
                {visibleLogs.map((log, i) => {
                  const style = EVENT_STYLE[log.event_type] ?? { color: 'text-[color:var(--muted)]', label: log.event_type }
                  return (
                    <div key={log.id} className={`flex items-center gap-4 px-5 py-3 text-sm ${i !== 0 ? 'border-t border-[color:var(--border)]' : ''}`}>
                      <span className={`font-semibold text-xs uppercase tracking-wide w-28 flex-shrink-0 ${style.color}`}>{style.label}</span>
                      <span className="text-[color:var(--text)] flex-1 line-clamp-1">{log.films?.title_en ?? log.metadata?.title ?? log.metadata?.name ?? '—'}</span>
                      <span className="text-[color:var(--muted)] text-xs flex-shrink-0">{log.profiles?.name ?? 'system'}</span>
                      <span className="text-[color:var(--faint)] text-xs flex-shrink-0 w-20 text-right">{timeAgo(log.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ERROR LOGS TAB */}
        {mainTab === 'errors' && (
          <>
            <p className="text-xs text-[color:var(--muted)] mb-4">Technical debug logs — auto-purged after 7 days.</p>
            <ErrorLogViewer />
          </>
        )}

        {/* CONTEST TAB */}
        {mainTab === 'contest' && (
          <>
            {/* Active contest banner */}
            {activeContest ? (
              <div className="bg-[color:var(--surface)] border border-[color:var(--accent)]/30 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-green-400">Active — Season {activeContest.season_number}</span>
                    </div>
                    <h3 className="font-bold text-[color:var(--text)]">{activeContest.title}</h3>
                    <div className="flex gap-4 mt-1 text-xs text-[color:var(--muted)]">
                      <span>🥇 {formatPrize(activeContest.prize_1st)}</span>
                      <span>🥈 {formatPrize(activeContest.prize_2nd)}</span>
                      <span>🥉 {formatPrize(activeContest.prize_3rd)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {activeContest.status === 'open' && (
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Switch "${activeContest.title}" to Voting phase?\n\nThis will:\n• Stop accepting new submissions\n• Enable public voting\n• Cannot be undone!`
                          )
                          if (!confirmed) return
                          const { error } = await supabase
                            .from('contests')
                            .update({ status: 'voting' })
                            .eq('id', activeContest.id)
                          if (error) { showToast(`Error: ${error.message}`, 'error'); return }
                          setActiveContest(prev => prev ? { ...prev, status: 'voting' } : null)
                          showToast('✅ Contest is now in Voting phase! Vote buttons are live.')
                        }}
                        className="bg-[#D4A017]/20 border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#D4A017]/30 transition">
                        🗳️ Switch to Voting Phase
                      </button>
                    )}
                    <button
                      onClick={() => setShowClosePanel(p => !p)}
                      className="bg-[#FF6B1A]/20 border border-[color:var(--accent-hot)]/40 text-[color:var(--accent-hot)] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#FF6B1A]/30 transition">
                      🏁 Close Contest & Pick Winners
                    </button>
                    {approvedEntries.length === 0 && (
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `⚠️ Cancel "${activeContest.title}" (Season ${activeContest.season_number})?\n\nThis contest has no approved+paid entries.\nThis will mark it as closed with no winners.\n\nProceed?`
                          )
                          if (!confirmed) return
                          const { error } = await supabase
                            .from('contests')
                            .update({ status: 'closed', ended_at: new Date().toISOString() })
                            .eq('id', activeContest.id)
                          if (error) { showToast(`Error: ${error.message}`, 'error'); return }
                          setActiveContest(null)
                          showToast(`✅ Season ${activeContest.season_number} cancelled (no entries).`)
                          fetchContestEntries()
                        }}
                        className="border border-red-700/40 text-red-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-red-700/20 transition">
                        🗑️ Cancel (No Entries)
                      </button>
                    )}
                  </div>
                </div>

                {/* Close contest panel */}
                {showClosePanel && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                    <p className="text-xs text-[color:var(--muted)] mb-4">
                      Select the top 3 winning films. Only approved + paid entries are shown, sorted by score.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {[
                        { label: '🥇 1st Place', value: winner1, setter: setWinner1 },
                        { label: '🥈 2nd Place', value: winner2, setter: setWinner2 },
                        { label: '🥉 3rd Place', value: winner3, setter: setWinner3 },
                      ].map((w) => (
                        <div key={w.label}>
                          <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
                            {w.label}
                          </label>
                          <select
                            value={w.value}
                            onChange={e => w.setter(e.target.value)}
                            className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-3 py-2 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                          >
                            <option value="">— Select film —</option>
                            {approvedEntries.map(e => (
                              <option key={e.id} value={e.films?.id ?? ''}>
                                {e.films?.title_en ?? 'Unknown'} (score: {e.contest_score})
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={closeContest}
                        disabled={closing || !winner1}
                        className="bg-[#FF6B1A] hover:bg-[#FF6B1A]/80 text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition disabled:opacity-40">
                        {closing ? '⏳ Closing...' : '🏁 Confirm & Close Season'}
                      </button>
                      <button
                        onClick={() => setShowClosePanel(false)}
                        className="border border-[color:var(--border)] text-[color:var(--muted)] px-4 py-2 rounded-lg text-sm hover:text-[color:var(--text)] transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[color:var(--muted)] text-sm mb-1">No active contest running.</p>
                    <p className="text-[color:var(--faint)] text-xs">Start a new season to accept entries.</p>
                  </div>
                  <button
                    onClick={() => setShowCreatePanel(p => !p)}
                    className="bg-[#D4A017]/20 border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#D4A017]/30 transition">
                    ➕ Create New Contest
                  </button>
                </div>

                {showCreatePanel && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                    <h3 className="text-sm font-bold text-[color:var(--accent)] uppercase tracking-wide mb-4">
                      New Contest Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Contest Title *</label>
                        <input
                          type="text"
                          value={newContestTitle}
                          onChange={e => setNewContestTitle(e.target.value)}
                          placeholder="e.g. CinemaVuru Season 1"
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Season Number *</label>
                        <input
                          type="number"
                          value={newSeasonNumber}
                          onChange={e => setNewSeasonNumber(Number(e.target.value))}
                          min={1}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Entry Fee (₹) *</label>
                        <input
                          type="number"
                          value={newEntryFee}
                          onChange={e => setNewEntryFee(Number(e.target.value))}
                          min={0}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">Submissions Close *</label>
                        <input
                          type="datetime-local"
                          value={newSubsCloseAt}
                          onChange={e => setNewSubsCloseAt(e.target.value)}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">🥇 1st Prize (₹)</label>
                        <input
                          type="number"
                          value={newPrize1}
                          onChange={e => setNewPrize1(Number(e.target.value))}
                          min={0}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">🥈 2nd Prize (₹)</label>
                        <input
                          type="number"
                          value={newPrize2}
                          onChange={e => setNewPrize2(Number(e.target.value))}
                          min={0}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">🥉 3rd Prize (₹)</label>
                        <input
                          type="number"
                          value={newPrize3}
                          onChange={e => setNewPrize3(Number(e.target.value))}
                          min={0}
                          className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                        />
                      </div>
                      <div>
                      <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">🗳️ Min Votes to Win</label>
                      <input
                        type="number"
                        value={newMinVotes}
                        onChange={e => setNewMinVotes(Number(e.target.value))}
                        min={0}
                        className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition"
                      />
                      <p className="text-xs text-[color:var(--faint)] mt-1">Minimum votes a film must have to be eligible for prize money.</p>
                      </div>
                    </div>

                    <div className="bg-[color:var(--bg)] border border-[color:var(--accent)]/20 rounded-lg p-3 mb-4 text-xs text-[color:var(--muted)]">
                      Prize Pool: <span className="text-[color:var(--accent)] font-bold">₹{(newPrize1 + newPrize2 + newPrize3).toLocaleString('en-IN')}</span>
                      &nbsp;·&nbsp; Entry Fee: <span className="text-[color:var(--accent-hot)] font-bold">₹{newEntryFee}</span>
                      &nbsp;·&nbsp; Break even at <span className="text-white font-bold">{newEntryFee > 0 ? Math.ceil((newPrize1 + newPrize2 + newPrize3) / newEntryFee) : '∞'} entries</span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={createContest}
                        disabled={creating || !newContestTitle.trim() || !newSubsCloseAt}
                        className="bg-[#D4A017] hover:bg-[#D4A017]/80 text-black px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition disabled:opacity-40">
                        {creating ? '⏳ Creating...' : '🚀 Launch Contest'}
                      </button>
                      <button
                        onClick={() => setShowCreatePanel(false)}
                        className="border border-[color:var(--border)] text-[color:var(--muted)] px-4 py-2 rounded-lg text-sm hover:text-[color:var(--text)] transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-[color:var(--muted)] mb-3">
              Contest entries — approve after verifying payment is confirmed.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: 'all',      label: 'All' },
                  { key: 'paid',     label: '💳 Paid' },
                  { key: 'unpaid',   label: '⏳ Unpaid' },
                  { key: 'approved', label: '✅ Approved' },
                  { key: 'pending',  label: '🔸 Needs approval' },
                ] as { key: typeof entryFilter; label: string }[]).map(f => (
                  <button key={f.key} onClick={() => setEntryFilter(f.key)}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition ${entryFilter === f.key ? 'bg-[#D4A017]/15 text-[color:var(--accent)] border border-[color:var(--accent)]/30' : 'text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={entrySearch}
                onChange={e => setEntrySearch(e.target.value)}
                placeholder="🔍 Film or creator..."
                className="w-full sm:w-56 sm:ml-auto bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg px-3 py-1.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition"
              />
            </div>
            {contestLoading
              ? <div className="text-center py-16 text-[color:var(--muted)]">Loading...</div>
              : contestEntries.length === 0
              ? <div className="text-center py-16 text-[color:var(--muted)]"><div className="text-4xl mb-2">🏆</div><p>No contest entries yet</p></div>
              : visibleEntries.length === 0
              ? <div className="text-center py-16 text-[color:var(--muted)]"><div className="text-4xl mb-2">🔍</div><p>No entries match your filters</p></div>
              : (
                <div className="space-y-3">
                  {visibleEntries.map((entry) => {
                    const i = contestEntries.indexOf(entry)
                    return (
                    <div key={entry.id} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {activeContest?.status === 'voting' && i === 0 && <span className="text-sm">🥇</span>}
                            {activeContest?.status === 'voting' && i === 1 && <span className="text-sm">🥈</span>}
                            {activeContest?.status === 'voting' && i === 2 && <span className="text-sm">🥉</span>}
                            {activeContest?.status === 'open' && <span className="text-xs text-[color:var(--faint)] font-bold">#{i + 1}</span>}
                            <h3 className="font-bold text-[color:var(--text)]">
                              {entry.films?.title_en ?? 'Unknown Film'}
                            </h3>
                          </div>
                          <p className="text-[color:var(--muted)] text-xs mb-2">
                            by {entry.profiles?.name ?? 'Unknown'} · Score: <span className="text-[color:var(--accent)] font-bold">{entry.contest_score}</span>
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                              entry.payment_status === 'paid'
                                ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                                : 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40'
                            }`}>
                              💳 {entry.payment_status}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                              entry.is_approved
                                ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                                : 'bg-red-900/40 text-red-400 border border-red-700/40'
                            }`}>
                              {entry.is_approved ? '✅ Approved' : '⏳ Pending'}
                            </span>
                            {entry.payment_ref && (
                              <span className="text-xs bg-[#D4A017]/10 border border-[color:var(--accent)]/20 text-[color:var(--accent)] px-2 py-0.5 rounded">
                                UTR: {entry.payment_ref}
                              </span>
                            )}
                            {entry.razorpay_payment_id && (
                              <span className="text-xs text-[color:var(--faint)]">
                                ID: {entry.razorpay_payment_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!entry.is_approved && entry.payment_status === 'paid' && (
                            <button onClick={() => approveForContestAndFeed(entry.id, entry.films?.id ?? '')}
                              className="bg-green-700/80 hover:bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase transition">
                              ✅ Approve for Contest & Feed
                            </button>
                          )}
                          {entry.is_approved && (
                            <button onClick={() => updateContestEntry(entry.id, false)}
                              className="border border-red-700/40 text-red-400 px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-red-700/20 transition">
                              ❌ Revoke
                            </button>
                          )}
                          {entry.payment_status === 'pending_verification' && (
                            <button onClick={async () => {
                              const confirmed = window.confirm(
                                `Mark payment as verified for "${entry.films?.title_en}"?\n\nUTR: ${entry.payment_ref}\n\nOnly confirm after checking this UTR in your UPI app.`
                              )
                              if (!confirmed) return
                              const { error } = await supabase
                                .from('contest_entries')
                                .update({ payment_status: 'paid' })
                                .eq('id', entry.id)
                              if (error) { showToast(`Error: ${error.message}`, 'error'); return }
                              setContestEntries(prev => prev.map(e =>
                                e.id === entry.id ? { ...e, payment_status: 'paid' } : e
                              ))
                              showToast('💳 Payment marked verified')
                            }}
                            className="bg-[#D4A017]/20 border border-[color:var(--accent)]/40 text-[color:var(--accent)] px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-[#D4A017]/30 transition">
                              💳 Verify & Mark Paid
                            </button>
                          )}
                          {entry.payment_status === 'pending' && (
                            <span className="text-xs text-yellow-600 text-center">Awaiting payment</span>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
          </>
        )}

      </div>
    </div>
  )
}
