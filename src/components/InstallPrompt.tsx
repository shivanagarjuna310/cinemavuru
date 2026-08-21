'use client'
// "Add to Home Screen" prompt. On Android/Chrome/Edge it captures the native
// beforeinstallprompt and offers a one-tap Install. On iOS Safari (which has no
// such event) it shows the Share → "Add to Home Screen" hint. Non-nagging:
// hidden once installed, and snoozed for 14 days after a dismiss.

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'cv_install_dismissed'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Already installed → never show.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    if (standalone) return

    // Recently dismissed → snooze.
    try {
      const d = localStorage.getItem(DISMISS_KEY)
      if (d && Date.now() - Number(d) < SNOOZE_MS) return
    } catch {}

    const ua = navigator.userAgent || ''
    const isiOS = /iphone|ipad|ipod/i.test(ua)
    const iosSafari = isiOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)

    if (iosSafari) {
      setIsIOS(true)
      const t = setTimeout(() => setShow(true), 3500)
      return () => clearTimeout(t)
    }

    function onBIP(e: Event) {
      e.preventDefault()          // stop Chrome's mini-infobar; we show our own
      setDeferred(e)
      setShow(true)
    }
    function onInstalled() { setShow(false) }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    setDeferred(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed z-[90] bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-[22rem]
      rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl p-4 anim-pop">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B1A] to-[#D4A017] flex items-center justify-center text-xl flex-shrink-0">🎬</div>
        <div className="flex-1 min-w-0">
          <p className="text-[color:var(--text)] font-bold text-sm">Install CinemaVuru</p>
          {isIOS ? (
            <p className="text-[color:var(--muted)] text-xs mt-1 leading-relaxed">
              Tap <span className="inline-flex items-center gap-1 text-[color:var(--text)] font-semibold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>Share
              </span> then <span className="text-[color:var(--text)] font-semibold">“Add to Home Screen”</span>.
            </p>
          ) : (
            <p className="text-[color:var(--muted)] text-xs mt-1 leading-relaxed">
              Add it to your home screen for full-screen, app-like access.
            </p>
          )}

          {!isIOS && (
            <div className="flex gap-2 mt-3">
              <button onClick={install}
                className="bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide hover:opacity-90 transition">
                Install
              </button>
              <button onClick={dismiss}
                className="text-[color:var(--muted)] px-3 py-2 rounded-lg font-semibold text-xs hover:text-[color:var(--text)] transition">
                Not now
              </button>
            </div>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss"
          className="text-[color:var(--muted)] hover:text-[color:var(--text)] transition text-lg leading-none flex-shrink-0">×</button>
      </div>
    </div>
  )
}
