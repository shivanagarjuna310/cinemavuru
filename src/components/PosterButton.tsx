'use client'
// Opens the milestone poster for a film, with download and native share.
//
// Sharing the *image* rather than a link is the whole point: an Instagram story
// with a poster on it travels, a pasted URL does not. Where the browser
// supports sharing files (Android Chrome, iOS Safari) the poster goes straight
// into the share sheet; everywhere else it falls back to a download, which is
// what a desktop user would do before posting from their phone anyway.

import { useState } from 'react'

type Format = 'square' | 'story'

const LABEL: Record<Format, string> = {
  square: 'Post  1:1',
  story: 'Story  9:16',
}

export default function PosterButton({
  filmId,
  title,
  className = '',
}: {
  filmId: string
  title: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('square')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const src = `/api/poster/${filmId}?format=${format}`
  const filename = `${title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cinemavuru'}-${format}.png`

  async function withPoster(fn: (file: File) => Promise<void>) {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error('render failed')
      const blob = await res.blob()
      await fn(new File([blob], filename, { type: 'image/png' }))
    } catch {
      setNote('Could not build the poster. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleShare() {
    await withPoster(async (file) => {
      // canShare({files}) is the only reliable feature test — some browsers
      // expose navigator.share but reject file payloads.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: `${title} — on CinemaVuru` })
        } catch {
          /* dismissed */
        }
        return
      }
      download(file)
      setNote('Saved to your device — post it from there.')
    })
  }

  function download(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold ring-1 bg-[color:var(--surface)] text-[color:var(--muted)] ring-[color:var(--border)] hover:text-[color:var(--accent)] hover:ring-[color:var(--accent)]/40 transition ${className}`}
      >
        <span aria-hidden>🖼️</span>
        <span>Poster</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Shareable poster"
        >
          <div
            className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[color:var(--text)]">Share your poster</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[color:var(--muted)] hover:text-[color:var(--accent)] px-2"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {(['square', 'story'] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ring-1 transition ${
                    format === f
                      ? 'bg-[#D4A017]/15 text-[color:var(--accent)] ring-[color:var(--accent)]/45'
                      : 'bg-transparent text-[color:var(--muted)] ring-[color:var(--border)]'
                  }`}
                >
                  {LABEL[f]}
                </button>
              ))}
            </div>

            {/* key forces a reload when the format changes */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={format}
              src={src}
              alt={`Poster for ${title}`}
              className="w-full rounded-xl border border-[color:var(--border)] mb-4 bg-black"
            />

            {note && <p className="text-xs text-[color:var(--muted)] mb-3 text-center">{note}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShare}
                disabled={busy}
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black py-2.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-60 transition"
              >
                {busy ? 'Building…' : 'Share'}
              </button>
              <button
                onClick={() => withPoster(async (file) => download(file))}
                disabled={busy}
                className="border border-[color:var(--border)] text-[color:var(--text)] py-2.5 rounded-lg text-sm font-bold hover:border-[color:var(--accent)]/40 disabled:opacity-60 transition"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
