'use client'
// src/app/profile/page.tsx — logged-in user's profile dashboard:
// identity + KPIs (views/likes/followers) + email & genre preferences +
// a filterable film manager.

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'
import { supabase }            from '@/lib/supabase'
import Navbar                  from '@/components/Navbar'
import { useAuth }             from '@/components/AuthProvider'

const GENRES = ['Drama', 'Comedy', 'Thriller', 'Documentary', 'Family', 'Romance', 'RomCom', 'Horror', 'Action', 'Experimental']

type Profile = {
  id: string; name: string | null; bio: string | null; district_id: string | null
  districts?: any
}
type Film = {
  id: string; title_en: string; title_te: string | null; genre: string | null
  status: string; view_count: number; like_count: number; video_url: string | null
  created_at: string; districts?: any
}

function ytThumb(url: string | null): string | null {
  const m = url?.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null
}
function hrefFor(f: Film) {
  const d = Array.isArray(f.districts) ? f.districts[0] : f.districts
  const s = d && (Array.isArray(d.states) ? d.states[0] : d.states)
  return `/${s?.slug ?? 'telangana'}/${d?.slug ?? 'hyderabad'}/film/${f.id}`
}
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n) }
function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function MyProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const uid = user?.id ?? null

  const [profile, setProfile] = useState<Profile | null>(null)
  const [films, setFilms]     = useState<Film[]>([])
  const [followers, setFollowers] = useState(0)
  const [loading, setLoading] = useState(true)

  // Edit identity
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Preferences
  const [prefsOn, setPrefsOn]   = useState(true)     // email_opt_in
  const [genres, setGenres]     = useState<string[]>([])
  const [prefsAvailable, setPrefsAvailable] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSaved, setPrefsSaved]   = useState(false)

  const [filmFilter, setFilmFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all')

  useEffect(() => {
    if (authLoading) return
    if (!uid) { router.push('/auth'); return }
    let cancelled = false
    async function load() {
      const [profRes, filmRes] = await Promise.all([
        supabase.from('profiles').select('id, name, bio, district_id, districts(name_en, slug, states(slug))').eq('id', uid).single(),
        supabase.from('films').select('*, districts(slug, states(slug))').eq('creator_id', uid).order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setProfile(profRes.data as Profile)
      setEditName(profRes.data?.name ?? '')
      setEditBio(profRes.data?.bio ?? '')
      setFilms((filmRes.data as Film[]) ?? [])

      // Best-effort: followers (follows table) + prefs (may not be migrated yet)
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('creator_id', uid)
        .then(({ count }) => { if (!cancelled && typeof count === 'number') setFollowers(count) })
      supabase.from('profiles').select('email_opt_in, preferred_genres').eq('id', uid).maybeSingle()
        .then(({ data, error }) => {
          if (cancelled || error || !data) return
          setPrefsAvailable(true)
          setPrefsOn((data as any).email_opt_in ?? true)
          setGenres((data as any).preferred_genres ?? [])
        })

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [uid, authLoading, router])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ name: editName.trim(), bio: editBio.trim() }).eq('id', profile.id)
    if (!error) {
      setProfile(p => p ? { ...p, name: editName.trim(), bio: editBio.trim() } : p)
      setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function savePrefs() {
    if (!uid) return
    setSavingPrefs(true)
    const { error } = await supabase.from('profiles')
      .update({ email_opt_in: prefsOn, preferred_genres: genres }).eq('id', uid)
    if (!error) { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 3000) }
    setSavingPrefs(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center text-[color:var(--muted)]">Loading…</div>
    </>
  )

  const initial = (profile?.name ?? user?.email ?? 'F')[0].toUpperCase()
  const totalViews = films.reduce((s, f) => s + (f.view_count ?? 0), 0)
  const totalLikes = films.reduce((s, f) => s + (f.like_count ?? 0), 0)
  const activeFilms = films.filter(f => f.status === 'active')
  const pendingFilms = films.filter(f => f.status === 'pending')
  const dist = Array.isArray(profile?.districts) ? profile?.districts[0] : profile?.districts
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null
  const shown = filmFilter === 'all' ? films : films.filter(f => f.status === filmFilter)

  const kpis = [
    { label: 'Films', value: String(activeFilms.length) },
    { label: 'Views', value: fmt(totalViews) },
    { label: 'Likes', value: fmt(totalLikes) },
    { label: 'Followers', value: fmt(followers) },
  ]

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[color:var(--text)] pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-[color:var(--accent)] transition">Home</Link>
            <span>›</span>
            <span className="text-[color:var(--accent)]">My Profile</span>
          </div>

          {/* Identity card */}
          <div className="relative overflow-hidden bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6 mb-5">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#D4A017]/10 blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-5 flex-wrap">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-black text-2xl sm:text-3xl flex-shrink-0">
                {initial}
              </div>

              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                      className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm focus:outline-none focus:border-[color:var(--accent)]/50 transition" />
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell us about yourself as a filmmaker…" rows={3}
                      className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-4 py-2.5 text-[color:var(--text)] text-sm resize-none focus:outline-none focus:border-[color:var(--accent)]/50 transition" />
                    <div className="flex gap-3">
                      <button onClick={handleSave} disabled={saving}
                        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-40">
                        {saving ? 'Saving…' : '✓ Save'}
                      </button>
                      <button onClick={() => { setEditing(false); setEditName(profile?.name ?? ''); setEditBio(profile?.bio ?? '') }}
                        className="border border-[color:var(--border)] text-[color:var(--muted)] px-4 py-2 rounded-lg text-sm hover:text-[color:var(--text)] transition">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-[color:var(--text)]">{profile?.name ?? 'No name set'}</h1>
                      {saved && <span className="text-xs text-green-400">✓ Saved</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] flex-wrap mb-2">
                      {user?.email && <span>✉ {user.email}</span>}
                      {dist?.name_en && <><span>·</span><span>📍 {dist.name_en}</span></>}
                      {memberSince && <><span>·</span><span>Joined {memberSince}</span></>}
                    </div>
                    {profile?.bio
                      ? <p className="text-sm text-[color:var(--muted)] leading-relaxed mb-3 max-w-lg">{profile.bio}</p>
                      : <p className="text-sm text-[color:var(--faint)] italic mb-3">No bio yet — add one!</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setEditing(true)}
                        className="text-xs text-[color:var(--accent)] border border-[color:var(--accent)]/30 px-3 py-1.5 rounded-lg hover:bg-[#D4A017]/10 transition font-bold uppercase tracking-wide">✏️ Edit</button>
                      {profile && (
                        <Link href={`/creator/${profile.id}`}
                          className="text-xs text-[color:var(--muted)] border border-[color:var(--border)] px-3 py-1.5 rounded-lg hover:text-[color:var(--accent)] transition font-bold uppercase tracking-wide">👁 Public profile</Link>
                      )}
                      <button onClick={logout}
                        className="text-xs text-[color:var(--muted)] border border-[color:var(--border)] px-3 py-1.5 rounded-lg hover:text-[color:var(--accent-hot)] hover:border-[color:var(--accent-hot)]/40 transition font-bold uppercase tracking-wide">Logout</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {kpis.map(k => (
              <div key={k.label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-[color:var(--accent)]">{k.value}</div>
                <div className="text-[10px] text-[color:var(--muted)] uppercase tracking-[2px] mt-1 font-medium">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Preferences */}
          {prefsAvailable && (
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[color:var(--text)] uppercase tracking-widest">Preferences</h2>
                {prefsSaved && <span className="text-xs text-green-400">✓ Saved</span>}
              </div>

              {/* Email toggle */}
              <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-[color:var(--border)]">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">Email notifications</p>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5">Milestone alerts, updates & announcements.</p>
                </div>
                <button onClick={() => setPrefsOn(v => !v)} role="switch" aria-checked={prefsOn}
                  className={`relative w-12 h-6 rounded-full flex-shrink-0 transition ${prefsOn ? 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017]' : 'bg-[color:var(--border)]'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${prefsOn ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Favorite genres */}
              <p className="text-sm font-semibold text-[color:var(--text)] mb-1">Favourite genres</p>
              <p className="text-xs text-[color:var(--muted)] mb-3">Powers your personalized “For You” row.</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {GENRES.map(g => {
                  const on = genres.includes(g)
                  return (
                    <button key={g} onClick={() => setGenres(p => on ? p.filter(x => x !== g) : [...p, g])}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        on ? 'bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black border-transparent'
                           : 'bg-[color:var(--bg)] text-[color:var(--text)] border-[color:var(--border)] hover:border-[color:var(--accent)]/50'}`}>
                      {on ? '✓ ' : ''}{g}
                    </button>
                  )
                })}
              </div>

              <button onClick={savePrefs} disabled={savingPrefs}
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide disabled:opacity-40 hover:opacity-90 transition">
                {savingPrefs ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          )}

          {/* Pending notice */}
          {pendingFilms.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-400 text-sm font-semibold">⏳ {pendingFilms.length} film{pendingFilms.length > 1 ? 's' : ''} pending review</p>
              <p className="text-[color:var(--muted)] text-xs mt-0.5">Our team reviews and approves films within 24 hours.</p>
            </div>
          )}

          {/* My Films */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-bold text-[color:var(--muted)] uppercase tracking-widest">My Films</h2>
            <Link href="/upload" className="text-xs bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-2 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition">+ Upload</Link>
          </div>

          {films.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['all', 'active', 'pending', 'rejected'] as const).map(f => {
                const n = f === 'all' ? films.length : films.filter(x => x.status === f).length
                return (
                  <button key={f} onClick={() => setFilmFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition ${
                      filmFilter === f ? 'bg-[#D4A017]/20 text-[color:var(--accent)] border border-[color:var(--accent)]/40'
                                       : 'bg-[color:var(--surface)] text-[color:var(--muted)] border border-[color:var(--border)]'}`}>
                    {f} ({n})
                  </button>
                )
              })}
            </div>
          )}

          {films.length === 0 ? (
            <div className="text-center py-16 text-[color:var(--muted)]">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-sm mb-4">You haven&apos;t uploaded any films yet.</p>
              <Link href="/upload" className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">Upload Your First Film →</Link>
            </div>
          ) : shown.length === 0 ? (
            <p className="text-center py-10 text-[color:var(--muted)] text-sm">No {filmFilter} films.</p>
          ) : (
            <div className="space-y-3">
              {shown.map(film => (
                <div key={film.id} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-[color:var(--bg)] flex-shrink-0">
                    {ytThumb(film.video_url)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={ytThumb(film.video_url)!} alt={film.title_en} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[color:var(--text)] text-sm line-clamp-1">{film.title_en}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                        film.status === 'active' ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                          : film.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40'
                          : 'bg-red-900/40 text-red-400 border border-red-700/40'}`}>{film.status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[color:var(--muted)] flex-wrap">
                      {film.genre && <><span>{film.genre}</span><span>·</span></>}
                      <span>👁 {fmt(film.view_count)}</span><span>·</span>
                      <span>♥ {fmt(film.like_count)}</span><span>·</span>
                      <span>{timeAgo(film.created_at)}</span>
                    </div>
                  </div>
                  {film.status === 'active' && (
                    <Link href={hrefFor(film)}
                      className="text-xs text-[color:var(--accent)] border border-[color:var(--accent)]/30 px-3 py-1.5 rounded-lg hover:bg-[#D4A017]/10 transition font-bold uppercase tracking-wide flex-shrink-0">View →</Link>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
