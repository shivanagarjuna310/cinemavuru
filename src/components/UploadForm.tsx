'use client'
// src/components/UploadForm.tsx
// Film upload form. Saves to Supabase films table.
// Requires user to be logged in.

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'

type Status = 'idle' | 'loading' | 'success' | 'error'

const GENRES = [
  'Drama', 'Comedy', 'Thriller', 'Documentary',
  'Family', 'Romance', 'Horror', 'Action', 'Experimental',
]

// Convert a YouTube watch URL to embed URL
// e.g. https://youtu.be/abc123 → https://www.youtube.com/embed/abc123
// e.g. https://www.youtube.com/watch?v=abc123 → https://www.youtube.com/embed/abc123
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)

    // youtu.be/VIDEO_ID
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }

    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`

      // Already an embed URL
      if (u.pathname.startsWith('/embed/')) return url
    }

    return null
  } catch {
    return null
  }
}

export default function UploadForm() {
  const router = useRouter()

  // Auth state
  const [userId,     setUserId]     = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Form fields
  const [titleEn,      setTitleEn]      = useState('')
  const [titleTe,      setTitleTe]      = useState('')
  const [description,  setDescription]  = useState('')
  const [genre,        setGenre]        = useState('')
  const [youtubeUrl,   setYoutubeUrl]   = useState('')
  const [districtId,   setDistrictId]   = useState('')

  // UI state
  const [status,  setStatus]  = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [urlError, setUrlError] = useState('')

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      setCheckingAuth(false)
    })
  }, [])

  // Get Hyderabad district ID on mount
  useEffect(() => {
    supabase
      .from('districts')
      .select('id')
      .eq('slug', 'hyderabad')
      .single()
      .then(({ data }) => {
        if (data) setDistrictId(data.id)
      })
  }, [])

  // Validate YouTube URL as user types
  function handleUrlChange(val: string) {
    setYoutubeUrl(val)
    if (!val) { setUrlError(''); return }
    const embed = toEmbedUrl(val)
    if (!embed) {
      setUrlError('Please paste a valid YouTube URL (e.g. https://youtu.be/abc or https://youtube.com/watch?v=abc)')
    } else {
      setUrlError('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!userId) {
      setStatus('error')
      setMessage('You must be logged in to upload a film.')
      return
    }

    if (!districtId) {
      setStatus('error')
      setMessage('District not found. Please refresh and try again.')
      return
    }

    const embedUrl = toEmbedUrl(youtubeUrl)
    if (!embedUrl) {
      setStatus('error')
      setMessage('Please enter a valid YouTube URL.')
      return
    }

    setStatus('loading')
    setMessage('')

    const { error } = await supabase.from('films').insert({
      title_en:    titleEn.trim(),
      title_te:    titleTe.trim() || null,
      description: description.trim() || null,
      genre:       genre,
      video_url:   embedUrl,
      creator_id:  userId,
      district_id: districtId,
      status:      'pending',   // Admin must approve before it goes live
      view_count:  0,
      like_count:  0,
    })

    if (error) {
      setStatus('error')
      setMessage(`Upload failed: ${error.message}`)
    } else {
      setStatus('success')
      setMessage('🎉 Film submitted! We will review and publish it within 24 hours.')
      // Reset form
      setTitleEn('')
      setTitleTe('')
      setDescription('')
      setGenre('')
      setYoutubeUrl('')
    }
  }

  // Still checking auth
  if (checkingAuth) {
    return (
      <div className="text-center py-20 text-[#7A6040]">
        <div className="text-3xl mb-3">⏳</div>
        <p>Checking login status...</p>
      </div>
    )
  }

  // Not logged in
  if (!userId) {
    return (
      <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-[#FDF6E3] mb-2">Login Required</h2>
        <p className="text-[#7A6040] mb-6 text-sm">
          You need to be logged in to upload a film.
        </p>
        <button
          onClick={() => router.push('/auth')}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition"
        >
          Login / Create Account
        </button>
      </div>
    )
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="bg-[#1A1208] border border-green-700/30 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold text-green-400 mb-3">Film Submitted!</h2>
        <p className="text-[#7A6040] mb-2">{message}</p>
        <p className="text-[#7A6040] text-sm mb-8">
          Once approved, your film will appear on the Hyderabad film feed.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setStatus('idle')}
            className="border border-[#D4A017]/40 text-[#D4A017] px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide hover:bg-[#D4A017]/10 transition text-sm"
          >
            Submit Another Film
          </button>
          <button
            onClick={() => router.push('/telangana/hyderabad')}
            className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition text-sm"
          >
            View Hyderabad Films
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1208] border border-[#2E2010] rounded-2xl p-8">

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Title English */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Film Title (English) <span className="text-[#FF6B1A]">*</span>
          </label>
          <input
            type="text"
            value={titleEn}
            onChange={e => setTitleEn(e.target.value)}
            placeholder="e.g. The Last Rain"
            required
            maxLength={200}
            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
          />
        </div>

        {/* Title Telugu */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Film Title (Telugu) <span className="text-[#4A3020]">— Optional</span>
          </label>
          <input
            type="text"
            value={titleTe}
            onChange={e => setTitleTe(e.target.value)}
            placeholder="తెలుగు శీర్షిక"
            maxLength={200}
            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition"
          />
        </div>

        {/* Genre */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Genre <span className="text-[#FF6B1A]">*</span>
          </label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            required
            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm focus:outline-none focus:border-[#D4A017]/50 transition"
          >
            <option value="" disabled>Select a genre</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            Description <span className="text-[#4A3020]">— Optional</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell viewers what your film is about..."
            rows={3}
            maxLength={1000}
            className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition resize-none"
          />
        </div>

        {/* YouTube URL */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            YouTube Video URL <span className="text-[#FF6B1A]">*</span>
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://youtu.be/your-video-id  or  https://youtube.com/watch?v=..."
            required
            className={`w-full bg-[#0D0A06] border rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none transition ${
              urlError
                ? 'border-red-700/60 focus:border-red-500'
                : 'border-[#2E2010] focus:border-[#D4A017]/50'
            }`}
          />
          {urlError && (
            <p className="text-red-400 text-xs mt-1.5">{urlError}</p>
          )}
          <p className="text-[#4A3020] text-xs mt-1.5">
            Upload your film to YouTube as <strong className="text-[#7A6040]">Unlisted</strong> first,
            then paste the link here.
          </p>
        </div>

        {/* District — locked to Hyderabad for now */}
        <div>
          <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
            District
          </label>
          <div className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#D4A017] text-sm flex items-center justify-between">
            <span>Hyderabad, Telangana</span>
            <span className="text-[10px] text-[#FF6B1A] uppercase tracking-widest bg-[#FF6B1A]/10 px-2 py-0.5 rounded">
              Live
            </span>
          </div>
          <p className="text-[#4A3020] text-xs mt-1.5">
            More districts coming soon.
          </p>
        </div>

        {/* Error message */}
        {status === 'error' && (
          <div className="bg-red-900/30 border border-red-700/40 text-red-300 rounded-lg px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading' || !!urlError}
          className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-3.5 rounded-lg font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {status === 'loading' ? '⏳ Submitting...' : '🎬 Submit Film for Review'}
        </button>

        <p className="text-center text-xs text-[#4A3020]">
          By submitting, you confirm this is your original work and you have rights to share it.
        </p>

      </form>
    </div>
  )
}
