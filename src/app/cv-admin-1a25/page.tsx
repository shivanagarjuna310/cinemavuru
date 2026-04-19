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

const EVENT_STYLE: Record<string, { color: string; label: string }> = {
  film_uploaded:   { color: 'text-blue-400',   label: '📤 Uploaded'   },
  film_approved:   { color: 'text-green-400',  label: '✅ Approved'   },
  film_rejected:   { color: 'text-red-400',    label: '❌ Rejected'   },
  user_registered: { color: 'text-[#D4A017]',  label: '👤 Registered' },
  system_cleanup:  { color: 'text-[#7A6040]',  label: '🗑 Cleanup'    },
}

export default function AdminPage() {
  const [access,     setAccess]     = useState<AccessState>('checking')
  const [mainTab,    setMainTab]    = useState<MainTab>('films')
  const [filmFilter, setFilmFilter] = useState<FilmFilter>('pending')
  const [films,      setFilms]      = useState<Film[]>([])
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
    const { data } = await supabase.from('films').select('*').eq('status', filmFilter).order('created_at', { ascending: false })
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

    // Fetch entries
    const { data } = await supabase
      .from('contest_entries')
      .select('*, films(id, title_en), profiles(name)')
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
    if (error) { alert(`Error: ${error.message}`); return }

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
  }

  async function updateContestEntry(entryId: string, isApproved: boolean) {
    const { error } = await supabase
      .from('contest_entries').update({ is_approved: isApproved }).eq('id', entryId)
    if (error) { alert(`Error: ${error.message}`); return }
    setContestEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, is_approved: isApproved } : e
    ))
  }

  // ── Close contest and crown winners ──────────────────────
  async function closeContest() {
    if (!activeContest) return
    if (!winner1) { alert('Please select at least the 1st place winner.'); return }

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
      alert(`Error closing contest: ${error.message}`)
      setClosing(false)
      return
    }

    setClosing(false)
    setShowClosePanel(false)
    setActiveContest(null)
    alert(`✅ Season ${activeContest.season_number} closed! Winners saved to Hall of Fame.`)
    fetchContestEntries()
  }

  async function deleteFilm(film: Film) {
    const confirmed = window.confirm(
      `⚠️ PERMANENTLY DELETE "${film.title_en}"?\n\nThis will also delete all likes, comments and views. Cannot be undone.`
    )
    if (!confirmed) return
    setDeleting(film.id)
    await supabase.from('likes').delete().eq('film_id', film.id)
    await supabase.from('comments').delete().eq('film_id', film.id)
    await supabase.from('film_views').delete().eq('film_id', film.id)
    await supabase.from('contest_entries').delete().eq('film_id', film.id)
    const { error: filmErr } = await supabase.from('films').delete().eq('id', film.id)
    if (filmErr) { alert(`❌ Delete failed: ${filmErr.message}`); setDeleting(null); return }
    setFilms(prev => prev.filter(f => f.id !== film.id))
    loadStats()
    setDeleting(null)
  }

  if (access === 'checking') return (
    <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center text-[#7A6040]">Checking...</div>
  )

  if (access === 'denied') return (
    <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center text-[#FDF6E3]">
      <div className="text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-[#FF6B1A] mb-2">Access Denied</h1>
        <a href="/" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase text-sm">Go Home</a>
      </div>
    </div>
  )

  // Approved entries sorted by score — for winner dropdowns
  const approvedEntries = contestEntries.filter(e => e.is_approved && e.payment_status === 'paid')

  return (
    <div className="min-h-screen bg-[#0D0A06] text-[#FDF6E3] p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#D4A017]">🎬 CinemaVuru Admin</h1>
            <p className="text-[#7A6040] text-sm mt-0.5">Platform management dashboard</p>
          </div>
          <a href="/" className="text-[#7A6040] hover:text-[#D4A017] text-sm transition">← Back to site</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Pending',    value: stats.pending, color: 'text-[#FF6B1A]' },
            { label: 'Live Films', value: stats.active,  color: 'text-green-400'  },
            { label: 'Users',      value: stats.users,   color: 'text-[#D4A017]'  },
            { label: 'Views',      value: stats.views >= 1000 ? `${(stats.views/1000).toFixed(1)}K` : stats.views, color: 'text-blue-400' },
            { label: 'Errors',     value: stats.errors,  color: stats.errors > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[#7A6040] uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {([
            { key: 'films',    label: '🎬 Films'    },
            { key: 'activity', label: '📋 Activity' },
            { key: 'errors',   label: `🐛 Errors${stats.errors > 0 ? ` (${stats.errors})` : ''}` },
            { key: 'contest',  label: '🏆 Contest'  },
          ] as { key: MainTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition ${mainTab === t.key ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/40' : 'bg-[#1A1208] text-[#7A6040] border border-[#2E2010]'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => {
            loadStats()
            if (mainTab === 'films')    fetchFilms()
            else if (mainTab === 'activity') fetchLogs()
            else if (mainTab === 'contest')  fetchContestEntries()
          }} className="ml-auto px-4 py-2 rounded-lg text-sm border border-[#2E2010] text-[#7A6040] hover:text-[#D4A017] transition">
            ↻ Refresh
          </button>
        </div>

        {/* FILMS TAB */}
        {mainTab === 'films' && (
          <>
            <div className="flex gap-2 mb-4">
              {(['pending','active','rejected'] as FilmFilter[]).map(s => (
                <button key={s} onClick={() => setFilmFilter(s)}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition capitalize ${filmFilter === s ? 'bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30' : 'text-[#7A6040] border border-[#2E2010]'}`}>
                  {s} {filmFilter === s && `(${films.length})`}
                </button>
              ))}
            </div>
            {loading ? <div className="text-center py-16 text-[#7A6040]">Loading...</div>
            : films.length === 0 ? (
              <div className="text-center py-16 text-[#7A6040]"><div className="text-4xl mb-2">✅</div><p>No {filmFilter} films</p></div>
            ) : (
              <div className="space-y-3">
                {films.map(film => (
                  <div key={film.id} className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#FDF6E3] mb-1">{film.title_en}</h3>
                        {film.title_te && <p className="text-[#7A6040] text-sm mb-1">{film.title_te}</p>}
                        <div className="flex gap-2 text-xs text-[#7A6040] flex-wrap mb-2">
                          <span className="bg-[#2E2010] px-2 py-0.5 rounded">{film.genre}</span>
                          <span>{timeAgo(film.created_at)}</span>
                          <span>👁 {film.view_count}</span>
                          <span>♥ {film.like_count}</span>
                        </div>
                        {film.video_url && (
                          <a href={film.video_url.replace('/embed/','/watch?v=')} target="_blank" rel="noopener noreferrer"
                            className="text-[#D4A017] text-xs hover:underline">▶ Preview →</a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
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
                ))}
              </div>
            )}
          </>
        )}

        {/* ACTIVITY TAB */}
        {mainTab === 'activity' && (
          <>
            <p className="text-xs text-[#7A6040] mb-4">Last 100 business events</p>
            {loading ? <div className="text-center py-16 text-[#7A6040]">Loading...</div>
            : logs.length === 0 ? <div className="text-center py-16 text-[#7A6040]"><p className="text-3xl mb-2">📋</p><p className="text-sm">No activity yet</p></div>
            : (
              <div className="bg-[#1A1208] border border-[#2E2010] rounded-xl overflow-hidden">
                {logs.map((log, i) => {
                  const style = EVENT_STYLE[log.event_type] ?? { color: 'text-[#7A6040]', label: log.event_type }
                  return (
                    <div key={log.id} className={`flex items-center gap-4 px-5 py-3 text-sm ${i !== 0 ? 'border-t border-[#2E2010]' : ''}`}>
                      <span className={`font-semibold text-xs uppercase tracking-wide w-28 flex-shrink-0 ${style.color}`}>{style.label}</span>
                      <span className="text-[#FDF6E3] flex-1 line-clamp-1">{log.films?.title_en ?? log.metadata?.title ?? log.metadata?.name ?? '—'}</span>
                      <span className="text-[#7A6040] text-xs flex-shrink-0">{log.profiles?.name ?? 'system'}</span>
                      <span className="text-[#4A3020] text-xs flex-shrink-0 w-20 text-right">{timeAgo(log.created_at)}</span>
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
            <p className="text-xs text-[#7A6040] mb-4">Technical debug logs — auto-purged after 7 days.</p>
            <ErrorLogViewer />
          </>
        )}

        {/* CONTEST TAB */}
        {mainTab === 'contest' && (
          <>
            {/* Active contest banner */}
            {activeContest ? (
              <div className="bg-[#1A0A00] border border-[#D4A017]/30 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest text-green-400">Active — Season {activeContest.season_number}</span>
                    </div>
                    <h3 className="font-bold text-[#FDF6E3]">{activeContest.title}</h3>
                    <div className="flex gap-4 mt-1 text-xs text-[#7A6040]">
                      <span>🥇 {formatPrize(activeContest.prize_1st)}</span>
                      <span>🥈 {formatPrize(activeContest.prize_2nd)}</span>
                      <span>🥉 {formatPrize(activeContest.prize_3rd)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClosePanel(p => !p)}
                    className="bg-[#FF6B1A]/20 border border-[#FF6B1A]/40 text-[#FF6B1A] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#FF6B1A]/30 transition">
                    🏁 Close Contest & Pick Winners
                  </button>
                </div>

                {/* Close contest panel */}
                {showClosePanel && (
                  <div className="mt-4 pt-4 border-t border-[#2E2010]">
                    <p className="text-xs text-[#7A6040] mb-4">
                      Select the top 3 winning films. Only approved + paid entries are shown, sorted by score.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {[
                        { label: '🥇 1st Place', value: winner1, setter: setWinner1 },
                        { label: '🥈 2nd Place', value: winner2, setter: setWinner2 },
                        { label: '🥉 3rd Place', value: winner3, setter: setWinner3 },
                      ].map((w) => (
                        <div key={w.label}>
                          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
                            {w.label}
                          </label>
                          <select
                            value={w.value}
                            onChange={e => w.setter(e.target.value)}
                            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-3 py-2 text-[#FDF6E3] text-sm focus:outline-none focus:border-[#D4A017]/50 transition"
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
                        className="border border-[#2E2010] text-[#7A6040] px-4 py-2 rounded-lg text-sm hover:text-[#FDF6E3] transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-4 mb-5 text-center">
                <p className="text-[#7A6040] text-sm">No active contest. Create one in Supabase to get started.</p>
              </div>
            )}

            <p className="text-xs text-[#7A6040] mb-4">
              Contest entries — approve after verifying payment is confirmed.
            </p>
            {contestLoading
              ? <div className="text-center py-16 text-[#7A6040]">Loading...</div>
              : contestEntries.length === 0
              ? <div className="text-center py-16 text-[#7A6040]"><div className="text-4xl mb-2">🏆</div><p>No contest entries yet</p></div>
              : (
                <div className="space-y-3">
                  {contestEntries.map((entry, i) => (
                    <div key={entry.id} className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {i === 0 && <span className="text-sm">🥇</span>}
                            {i === 1 && <span className="text-sm">🥈</span>}
                            {i === 2 && <span className="text-sm">🥉</span>}
                            <h3 className="font-bold text-[#FDF6E3]">
                              {entry.films?.title_en ?? 'Unknown Film'}
                            </h3>
                          </div>
                          <p className="text-[#7A6040] text-xs mb-2">
                            by {entry.profiles?.name ?? 'Unknown'} · Score: <span className="text-[#D4A017] font-bold">{entry.contest_score}</span>
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
                            {entry.razorpay_payment_id && (
                              <span className="text-xs text-[#4A3020]">
                                ID: {entry.razorpay_payment_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!entry.is_approved && entry.payment_status === 'paid' && (
                            <button onClick={() => updateContestEntry(entry.id, true)}
                              className="bg-green-700/80 hover:bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase transition">
                              ✅ Approve
                            </button>
                          )}
                          {entry.is_approved && (
                            <button onClick={() => updateContestEntry(entry.id, false)}
                              className="border border-red-700/40 text-red-400 px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-red-700/20 transition">
                              ❌ Revoke
                            </button>
                          )}
                          {entry.payment_status !== 'paid' && (
                            <span className="text-xs text-yellow-600 text-center">Awaiting payment</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </>
        )}

      </div>
    </div>
  )
}
