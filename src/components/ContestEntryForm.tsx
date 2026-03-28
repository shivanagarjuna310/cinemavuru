'use client'
// src/components/ContestEntryForm.tsx — fixed type errors

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'

// ── Explicit Contest type to avoid missing property errors ────
type Contest = {
  id:                   string
  title:                string
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

export default function ContestEntryForm() {
  const router = useRouter()

  const [userId,         setUserId]         = useState<string | null>(null)
  const [contest,        setContest]        = useState<Contest | null>(null)
  const [myFilms,        setMyFilms]        = useState<Film[]>([])
  const [filmId,         setFilmId]         = useState('')
  const [newTitle,       setNewTitle]       = useState('')
  const [newGenre,       setNewGenre]       = useState('Drama')
  const [youtubeUrl,     setYoutubeUrl]     = useState('')
  const [status,         setStatus]         = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [message,        setMessage]        = useState('')
  const [alreadyEntered, setAlreadyEntered] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: c } = await supabase
        .from('contests')
        .select('id, title, entry_fee, prize_1st, prize_2nd, prize_3rd, submissions_close_at')
        .eq('status', 'open')
        .limit(1)
        .single()

      if (c) setContest(c as Contest)
      if (!c) return

      const { data: films } = await supabase
        .from('films')
        .select('id, title_en')
        .eq('creator_id', user.id)
        .eq('status', 'active')
      setMyFilms(films ?? [])

      const { data: entry } = await supabase
        .from('contest_entries')
        .select('id')
        .eq('contest_id', c.id)
        .eq('creator_id', user.id)
        .maybeSingle()
      if (entry) setAlreadyEntered(true)
    }
    init()
  }, [])

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
    if (!userId || !contest) return

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

      const { data: district } = await supabase
        .from('districts').select('id').eq('slug', 'hyderabad').single()

      const { data: newFilm, error: filmError } = await supabase
        .from('films')
        .insert({
          title_en:    newTitle || 'Contest Film',
          genre:       newGenre,
          video_url:   embedUrl,
          creator_id:  userId,
          district_id: district?.id,
          status:      'active',
          view_count:  0,
          like_count:  0,
        })
        .select('id')
        .single()

      if (filmError || !newFilm) {
        setStatus('error')
        setMessage('Could not create film. Please upload your film first, then come back.')
        return
      }
      targetFilmId = newFilm.id
    }

    if (!targetFilmId) {
      setStatus('error')
      setMessage('Please select a film or paste a YouTube URL.')
      return
    }

    const { error } = await supabase.from('contest_entries').insert({
      contest_id:     contest.id,
      film_id:        targetFilmId,
      creator_id:     userId,
      payment_status: 'pending',
      is_approved:    false,
    })

    if (error) {
      setStatus('error')
      setMessage(error.code === '23505'
        ? 'You have already entered this contest with this film.'
        : `Submission failed: ${error.message}`)
      return
    }

    setStatus('success')
    setMessage('🎉 Film submitted! Complete payment below to confirm your entry.')
  }

  if (!userId) return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">🔐</div>
      <p className="text-[#FDF6E3] font-semibold mb-2">Login Required</p>
      <p className="text-[#7A6040] text-sm mb-6">You need to be logged in to enter the contest.</p>
      <button onClick={() => router.push('/auth')}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-wide text-sm">
        Login / Create Account
      </button>
    </div>
  )

  if (!contest) return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">⏳</div>
      <p className="text-[#FDF6E3] font-semibold mb-2">No Active Contest</p>
      <p className="text-[#7A6040] text-sm">Check back soon for the next contest!</p>
    </div>
  )

  if (alreadyEntered) return (
    <div className="bg-[#1A1208] border border-green-700/30 rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">✅</div>
      <p className="text-green-400 font-semibold mb-2">You&apos;ve Already Entered!</p>
      <p className="text-[#7A6040] text-sm mb-6">Your film is in the contest. Share it to get more votes!</p>
      <button onClick={() => router.push('/contest')}
        className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-3 rounded-lg font-bold uppercase text-sm">
        View Leaderboard →
      </button>
    </div>
  )

  if (status === 'success') return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎬</div>
        <p className="text-green-400 font-bold text-lg mb-2">Film Submitted!</p>
        <p className="text-[#7A6040] text-sm">{message}</p>
      </div>
      <div className="bg-[#0D0A06] border border-[#2E2010] rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#D4A017] uppercase tracking-wide mb-3">
          Complete Payment — ₹{contest.entry_fee}
        </h3>
        <p className="text-[#7A6040] text-sm mb-4 leading-relaxed">
          Your entry is reserved. Pay the entry fee to confirm. Without payment, your film won&apos;t appear in the contest.
        </p>
        <button
          onClick={() => alert('Razorpay integration coming soon!\n\nFor testing: Contact the admin to manually mark your payment as complete.')}
          className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3 rounded-lg font-bold uppercase tracking-wide text-sm"
        >
          Pay ₹{contest.entry_fee} via UPI / Card →
        </button>
        <p className="text-center text-xs text-[#4A3020] mt-3">
          Razorpay · Refundable if contest is cancelled
        </p>
      </div>
    </div>
  )

  return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8">
      <div className="mb-6 p-4 bg-[#D4A017]/05 border border-[#D4A017]/20 rounded-xl">
        <p className="text-sm text-[#D4A017] font-semibold mb-0.5">{contest.title}</p>
        <p className="text-xs text-[#7A6040]">
          Entry Fee: ₹{contest.entry_fee} · Prize Pool: ₹{(contest.prize_1st + contest.prize_2nd + contest.prize_3rd).toLocaleString('en-IN')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {myFilms.length > 0 && (
          <div>
            <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
              Select Your Film (already uploaded)
            </label>
            <select value={filmId} onChange={e => setFilmId(e.target.value)}
              className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm focus:outline-none focus:border-[#D4A017]/50 transition">
              <option value="">— Choose a film —</option>
              {myFilms.map(f => <option key={f.id} value={f.id}>{f.title_en}</option>)}
            </select>
          </div>
        )}

        {!filmId && (
          <>
            {myFilms.length > 0 && (
              <div className="text-center text-xs text-[#7A6040] py-1">— or submit a new film —</div>
            )}
            <div>
              <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">Film Title *</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Your film title" required={!filmId}
                className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition" />
            </div>
            <div>
              <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">Genre *</label>
              <select value={newGenre} onChange={e => setNewGenre(e.target.value)}
                className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm focus:outline-none focus:border-[#D4A017]/50 transition">
                {['Drama','Comedy','Thriller','Documentary','Family','Romance','Action','Experimental'].map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">YouTube URL *</label>
              <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://youtu.be/your-film-id" required={!filmId}
                className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition" />
              <p className="text-xs text-[#4A3020] mt-1">Upload to YouTube as Unlisted, paste the link here.</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-300 rounded-lg px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <button type="submit" disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3.5 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-50 text-sm">
          {status === 'loading' ? '⏳ Submitting...' : `Submit & Pay ₹${contest.entry_fee} →`}
        </button>

        <p className="text-center text-xs text-[#4A3020]">
          By entering, you confirm this is your original work.
        </p>
      </form>
    </div>
  )
}
