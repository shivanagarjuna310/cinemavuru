'use client'
// Admin panel to set the Monthly Award Winner featured on the homepage.
// Uploads the photo to the 'winners' Storage bucket and upserts an active row.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type FilmOpt = { id: string; title_en: string }

export default function WinnerAdmin() {
  const [current, setCurrent] = useState<any>(null)
  const [films, setFilms] = useState<FilmOpt[]>([])

  const [name, setName]           = useState('')
  const [filmTitle, setFilmTitle] = useState('')
  const [month, setMonth]         = useState('')
  const [blurb, setBlurb]         = useState('')
  const [filmId, setFilmId]       = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')
  const [err, setErr]       = useState('')

  async function loadCurrent() {
    const { data } = await supabase
      .from('monthly_winners').select('*')
      .eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setCurrent(data ?? null)
  }

  useEffect(() => {
    loadCurrent()
    supabase.from('films').select('id, title_en').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => setFilms(data ?? []))
  }, [])

  function onFile(f: File | null) {
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function onPickFilm(id: string) {
    setFilmId(id)
    const f = films.find(x => x.id === id)
    if (f && !filmTitle.trim()) setFilmTitle(f.title_en)
  }

  async function save() {
    setErr(''); setMsg('')
    if (!name.trim()) { setErr('Winner name is required.'); return }
    if (!file && !current) { setErr('Please upload a winner photo.'); return }

    setSaving(true)
    try {
      let imageUrl = current?.image_url ?? ''
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `winner-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('winners')
          .upload(path, file, { upsert: true, cacheControl: '3600' })
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('winners').getPublicUrl(path).data.publicUrl
      }

      await supabase.from('monthly_winners').update({ is_active: false }).eq('is_active', true)
      const { error: insErr } = await supabase.from('monthly_winners').insert({
        winner_name: name.trim(),
        film_title:  filmTitle.trim() || null,
        month:       month.trim() || null,
        blurb:       blurb.trim() || null,
        film_id:     filmId || null,
        image_url:   imageUrl,
        is_active:   true,
      })
      if (insErr) throw insErr

      setMsg('✅ Winner published to the homepage!')
      setFile(null); setPreview(null); setName(''); setFilmTitle(''); setMonth(''); setBlurb(''); setFilmId('')
      loadCurrent()
    } catch (e: any) {
      setErr(e?.message ?? 'Save failed. Ensure WINNER_SETUP.sql (table + storage bucket) has been run.')
    } finally {
      setSaving(false)
    }
  }

  async function clearWinner() {
    await supabase.from('monthly_winners').update({ is_active: false }).eq('is_active', true)
    loadCurrent()
  }

  const input = 'w-full bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg px-3.5 py-2.5 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none focus:border-[color:var(--accent)]/50 transition'
  const label = 'block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5'

  return (
    <div className="grid lg:grid-cols-[1fr_18rem] gap-6 items-start">
      {/* Form */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[color:var(--text)] mb-1">👑 Set Monthly Winner</h3>
        <p className="text-[color:var(--muted)] text-xs mb-5">This appears in the featured spotlight on the homepage.</p>

        {/* Photo */}
        <div className="mb-4">
          <label className={label}>Winner Photo <span className="text-[color:var(--accent-hot)]">*</span></label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-28 rounded-lg overflow-hidden bg-[color:var(--bg)] border border-[color:var(--border)] flex items-center justify-center flex-shrink-0">
              {preview || current?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview ?? current?.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🖼️</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0] ?? null)}
                className="block text-xs text-[color:var(--muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#FF6B1A] file:to-[#D4A017] file:text-black file:font-bold file:text-xs file:cursor-pointer" />
              <p className="text-[color:var(--faint)] text-[11px] mt-2">Portrait works best (4:5). JPG/PNG.</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={label}>Winner Name <span className="text-[color:var(--accent-hot)]">*</span></label>
            <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shiva Varkalaa" maxLength={120} />
          </div>
          <div>
            <label className={label}>Month <span className="text-[color:var(--faint)]">— label</span></label>
            <input className={input} value={month} onChange={e => setMonth(e.target.value)} placeholder="e.g. August 2026" maxLength={40} />
          </div>
        </div>

        <div className="mb-4">
          <label className={label}>Link to film <span className="text-[color:var(--faint)]">— optional</span></label>
          <select className={input} value={filmId} onChange={e => onPickFilm(e.target.value)}>
            <option value="">— None —</option>
            {films.map(f => <option key={f.id} value={f.id}>{f.title_en}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className={label}>Film Title <span className="text-[color:var(--faint)]">— shown on card</span></label>
          <input className={input} value={filmTitle} onChange={e => setFilmTitle(e.target.value)} placeholder="e.g. Pakkinti Junior" maxLength={200} />
        </div>

        <div className="mb-5">
          <label className={label}>Blurb / Citation <span className="text-[color:var(--faint)]">— optional</span></label>
          <textarea className={`${input} resize-none`} rows={3} value={blurb} onChange={e => setBlurb(e.target.value)}
            placeholder="A line on why they won — screened, voted #1, jury pick…" maxLength={300} />
        </div>

        {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
        {msg && <p className="text-green-400 text-sm mb-3">{msg}</p>}

        <button onClick={save} disabled={saving}
          className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide disabled:opacity-50 hover:opacity-90 transition">
          {saving ? 'Publishing…' : 'Publish Winner'}
        </button>
      </div>

      {/* Current */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
        <h4 className="text-sm font-bold text-[color:var(--text)] mb-3">Currently featured</h4>
        {current ? (
          <div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.image_url} alt={current.winner_name} className="w-full aspect-[4/5] object-cover rounded-lg" />
              <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-base shadow">🏆</div>
            </div>
            <p className="text-[color:var(--text)] font-bold mt-3">{current.winner_name}</p>
            {current.film_title && <p className="text-[color:var(--accent)] text-sm italic">for “{current.film_title}”</p>}
            {current.month && <p className="text-[color:var(--muted)] text-xs mt-1">{current.month}</p>}
            <button onClick={clearWinner}
              className="mt-4 w-full border border-[color:var(--border)] text-[color:var(--muted)] py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:text-[color:var(--accent-hot)] hover:border-[color:var(--accent-hot)]/40 transition">
              Remove from homepage
            </button>
          </div>
        ) : (
          <p className="text-[color:var(--muted)] text-sm">No winner featured yet.</p>
        )}
      </div>
    </div>
  )
}
