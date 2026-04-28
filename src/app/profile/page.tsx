'use client'
// src/app/profile/page.tsx — logged-in user's own profile

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'
import { supabase }            from '@/lib/supabase'
import Navbar                  from '@/components/Navbar'

type Profile = {
  id:   string
  name: string | null
  bio:  string | null
}

type Film = {
  id:         string
  title_en:   string
  title_te:   string | null
  genre:      string | null
  status:     string
  view_count: number
  like_count: number
  video_url:  string | null
  created_at: string
}

function getThumbnail(videoUrl: string | null): string | null {
  if (!videoUrl) return null
  const match = videoUrl.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (!match) return null
  return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days} days ago`
  return `${Math.floor(days / 30)} months ago`
}

export default function MyProfilePage() {
  const router = useRouter()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [films,    setFilms]    = useState<Film[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio,  setEditBio]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: prof }, { data: filmData }] = await Promise.all([
        supabase.from('profiles').select('id, name, bio').eq('id', user.id).single(),
        supabase.from('films').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      setEditName(prof?.name ?? '')
      setEditBio(prof?.bio ?? '')
      setFilms(filmData ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ name: editName.trim(), bio: editBio.trim() })
      .eq('id', profile.id)

    if (!error) {
      setProfile(p => p ? { ...p, name: editName.trim(), bio: editBio.trim() } : p)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0D0A06] flex items-center justify-center text-[#7A6040]">
        Loading...
      </div>
    </>
  )

  const initial     = (profile?.name ?? 'F')[0].toUpperCase()
  const totalViews  = films.reduce((s, f) => s + (f.view_count ?? 0), 0)
  const totalLikes  = films.reduce((s, f) => s + (f.like_count ?? 0), 0)
  const activeFilms = films.filter(f => f.status === 'active')
  const pendingFilms = films.filter(f => f.status === 'pending')

  return (
    <>
      <Navbar />
      <main className="relative z-10 min-h-screen text-[#FDF6E3] pt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex items-center gap-2 text-xs text-[#7A6040] uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-[#D4A017] transition">Home</Link>
            <span>›</span>
            <span className="text-[#D4A017]">My Profile</span>
          </div>

          {/* Profile card */}
          <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-5 flex-wrap">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
                {initial}
              </div>

              {/* Info / Edit */}
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-2.5 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        placeholder="Tell us about yourself as a filmmaker..."
                        rows={3}
                        className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-2.5 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleSave} disabled={saving}
                        className="bg-[#D4A017] hover:bg-[#D4A017]/80 text-black px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition disabled:opacity-40">
                        {saving ? '⏳ Saving...' : '✓ Save Changes'}
                      </button>
                      <button onClick={() => { setEditing(false); setEditName(profile?.name ?? ''); setEditBio(profile?.bio ?? '') }}
                        className="border border-[#2E2010] text-[#7A6040] px-4 py-2 rounded-lg text-sm hover:text-[#FDF6E3] transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-xl font-bold text-[#FDF6E3]">
                        {profile?.name ?? 'No name set'}
                      </h1>
                      {saved && <span className="text-xs text-green-400">✓ Saved!</span>}
                    </div>
                    {profile?.bio ? (
                      <p className="text-sm text-[#7A6040] leading-relaxed mb-3 max-w-lg">{profile.bio}</p>
                    ) : (
                      <p className="text-sm text-[#4A3020] italic mb-3">No bio yet — add one!</p>
                    )}
                    <button onClick={() => setEditing(true)}
                      className="text-xs text-[#D4A017] border border-[#D4A017]/30 px-3 py-1.5 rounded-lg hover:bg-[#D4A017]/10 transition font-bold uppercase tracking-wide">
                      ✏️ Edit Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 flex-shrink-0">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#D4A017]">{activeFilms.length}</div>
                  <div className="text-xs text-[#7A6040] uppercase tracking-wide">Films</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#D4A017]">
                    {totalViews >= 1000 ? `${(totalViews/1000).toFixed(1)}K` : totalViews}
                  </div>
                  <div className="text-xs text-[#7A6040] uppercase tracking-wide">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[#D4A017]">{totalLikes}</div>
                  <div className="text-xs text-[#7A6040] uppercase tracking-wide">Likes</div>
                </div>
              </div>
            </div>

            {/* Public profile link */}
            {profile && (
              <div className="mt-4 pt-4 border-t border-[#2E2010]">
                <Link href={`/creator/${profile.id}`}
                  className="text-xs text-[#7A6040] hover:text-[#D4A017] transition">
                  👁 View public profile →
                </Link>
              </div>
            )}
          </div>

          {/* Pending films notice */}
          {pendingFilms.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-400 text-sm font-semibold mb-1">
                ⏳ {pendingFilms.length} film{pendingFilms.length > 1 ? 's' : ''} pending review
              </p>
              <p className="text-[#7A6040] text-xs">
                Our team will review and approve your film within 24 hours.
              </p>
            </div>
          )}

          {/* My Films */}
          <h2 className="text-base font-bold text-[#7A6040] uppercase tracking-widest mb-4">
            My Films
          </h2>

          {films.length === 0 ? (
            <div className="text-center py-16 text-[#7A6040]">
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-sm mb-4">You haven&apos;t uploaded any films yet.</p>
              <Link href="/upload"
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm">
                Upload Your First Film →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {films.map(film => (
                <div key={film.id}
                  className="bg-[#1A1208] border border-[#2E2010] rounded-xl p-4 flex items-center gap-4">

                  {/* Thumbnail */}
                  <div className="relative w-20 h-12 rounded-lg overflow-hidden bg-[#0D0A06] flex-shrink-0">
                    {getThumbnail(film.video_url) ? (
                      <img src={getThumbnail(film.video_url)!} alt={film.title_en}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[#FDF6E3] text-sm line-clamp-1">{film.title_en}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                        film.status === 'active'
                          ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                          : film.status === 'pending'
                          ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40'
                          : 'bg-red-900/40 text-red-400 border border-red-700/40'
                      }`}>
                        {film.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#7A6040]">
                      <span>{film.genre}</span>
                      <span>·</span>
                      <span>👁 {film.view_count}</span>
                      <span>·</span>
                      <span>♥ {film.like_count}</span>
                      <span>·</span>
                      <span>{timeAgo(film.created_at)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  {film.status === 'active' && (
                    <Link href={`/telangana/hyderabad/film/${film.id}`}
                      className="text-xs text-[#D4A017] border border-[#D4A017]/30 px-3 py-1.5 rounded-lg hover:bg-[#D4A017]/10 transition font-bold uppercase tracking-wide flex-shrink-0">
                      View →
                    </Link>
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