'use client'
// src/components/UPIPayment.tsx
// Shows QR code + UPI ID, user enters UTR after paying
// Admin verifies UTR manually and approves entry

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'

interface UPIPaymentProps {
  contestEntryId: string
  entryFee: number
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function UPIPayment({
  contestEntryId,
  entryFee,
  onSuccess,
  onError,
}: UPIPaymentProps) {
  const [utrNumber, setUtrNumber] = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [utrError, setUtrError]   = useState('')

  // Configurable without a redeploy of this file; falls back to the live values.
  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'shivanagarjuna777@oksbi'
  const PAYEE_NAME = process.env.NEXT_PUBLIC_UPI_PAYEE || 'CinemaVuru'
  const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP || '917801007518'

  // Standard UPI deep link. Encoding the amount is the whole point: the old
  // static /upi-qr.png could not carry it, so payers had to type the figure in
  // themselves (and that PNG predated the current UPI ID, so it pointed at the
  // wrong payee entirely — which is why scanning it did not work).
  const upiLink =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
    `&pn=${encodeURIComponent(PAYEE_NAME)}` +
    `&am=${encodeURIComponent(String(entryFee))}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent('CinemaVuru contest entry')}`

  // Rendered from that link, so the QR can never drift from the UPI ID or fee.
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrError, setQrError] = useState(false)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(upiLink, { width: 480, margin: 1, errorCorrectionLevel: 'M' })
      .then(url => { if (alive) { setQrDataUrl(url); setQrError(false) } })
      .catch(() => { if (alive) setQrError(true) })
    return () => { alive = false }
  }, [upiLink])

  async function handleSubmit() {
    setUtrError('')
    if (!utrNumber.trim()) {
      setUtrError('Please enter your UTR / Transaction ID.')
      return
    }
    if (utrNumber.trim().length < 8) {
      setUtrError('UTR number looks too short. Please check and try again.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('contest_entries')
        .update({
          payment_ref:    utrNumber.trim(),
          payment_status: 'pending_verification',
        })
        .eq('id', contestEntryId)

      if (error) {
        // Unique constraint violation — UTR already used
        if (error.code === '23505') {
          setUtrError(
            'This UTR has already been used. If you made a genuine payment, contact us on WhatsApp below.'
          )
          setLoading(false)
          return
        }
        throw error
      }

      onSuccess()
    } catch (err: any) {
      console.error('UTR save error:', err)
      onError(`Could not save payment details: ${err?.message ?? JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function copyUPI() {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openWhatsApp() {
    const message = encodeURIComponent(
      `Hi! I made a payment of ₹${entryFee} for CinemaVuru contest entry.\n\nEntry ID: ${contestEntryId}\nUTR: ${utrNumber || 'Not entered yet'}\n\nPlease verify and approve my entry.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
  }

  return (
    <div className="space-y-5">

      {/* Amount banner */}
      <div className="bg-[#D4A017]/10 border border-[color:var(--accent)]/30 rounded-xl p-4 text-center">
        <p className="text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1">Amount to Pay</p>
        <p className="text-3xl font-bold text-[color:var(--accent)]">₹{entryFee}</p>
        <p className="text-xs text-[color:var(--faint)] mt-1">Contest Entry Fee — Non-refundable</p>
      </div>

      {/* Pay in-app — on a phone this opens GPay/PhonePe with the amount
          already filled in, which beats scanning a QR on the same device. */}
      <a
        href={upiLink}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black font-bold py-3.5 px-6 rounded-xl uppercase tracking-wide text-sm hover:opacity-90 transition"
      >
        📱 Pay ₹{entryFee} in your UPI app
      </a>

      {/* QR — generated from the same deep link, so it always matches. */}
      <div className="flex flex-col items-center">
        <p className="text-xs text-[color:var(--muted)] uppercase tracking-widest mb-3">
          Or scan on another phone
        </p>
        <div className="bg-white p-3 rounded-2xl shadow-lg">
          {qrDataUrl ? (
            // Plain <img>: the source is a runtime data URL, which next/image
            // cannot optimise anyway.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`UPI QR to pay ₹${entryFee} to ${UPI_ID}`} width={200} height={200} className="rounded-lg block" />
          ) : (
            <div className="w-[200px] h-[200px] grid place-items-center text-xs text-neutral-500 text-center px-4">
              {qrError ? 'QR unavailable — use the button above or the UPI ID below.' : 'Generating QR…'}
            </div>
          )}
        </div>
        <p className="text-xs text-[color:var(--muted)] mt-3">
          Amount ₹{entryFee} is pre-filled · GPay, PhonePe, Paytm, any UPI app
        </p>
      </div>

      {/* UPI ID with copy */}
      <div className="bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl p-4">
        <p className="text-xs text-[color:var(--muted)] uppercase tracking-widest mb-2">
          Or Pay using UPI ID
        </p>
        <div className="flex items-center justify-between gap-3">
          <code className="text-[color:var(--text)] text-sm font-mono">{UPI_ID}</code>
          <button
            onClick={copyUPI}
            className="text-xs bg-[color:var(--border)] hover:bg-[color:var(--border)] text-[color:var(--accent)] px-3 py-1.5 rounded-lg transition whitespace-nowrap">
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl p-4 space-y-2">
        <p className="text-xs text-[color:var(--accent)] uppercase tracking-widest mb-3">How to Pay</p>
        {[
          'Open GPay, PhonePe, or any UPI app',
          `Scan QR or enter UPI ID: ${UPI_ID}`,
          `Pay exactly ₹${entryFee}`,
          'Copy the UTR / Transaction ID from the app',
          'Paste it below and submit',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#D4A017]/20 text-[color:var(--accent)] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[color:var(--muted)] text-xs leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      {/* UTR Input */}
      <div>
        <label className="block text-xs text-[color:var(--muted)] uppercase tracking-widest mb-1.5">
          UTR / Transaction ID *
        </label>
        <input
          type="text"
          value={utrNumber}
          onChange={e => { setUtrNumber(e.target.value); setUtrError('') }}
          placeholder="e.g. 426813XXXXXXXX"
          className={`w-full bg-[color:var(--bg)] border rounded-lg px-4 py-3 text-[color:var(--text)] text-sm placeholder-[color:var(--faint)] focus:outline-none transition font-mono ${
            utrError ? 'border-red-500/50 focus:border-red-500' : 'border-[color:var(--border)] focus:border-[color:var(--accent)]/50'
          }`}
        />
        {utrError && (
          <p className="text-xs text-red-400 mt-1">{utrError}</p>
        )}
        <p className="text-xs text-[color:var(--faint)] mt-1">
          Find this in your UPI app under payment history / transaction details
        </p>
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !utrNumber.trim()}
        className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black font-bold py-3 px-6 rounded-xl uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition">
        {loading ? '⏳ Submitting...' : '✅ I Have Paid — Submit UTR'}
      </button>

      {/* WhatsApp fallback */}
      <div className="border border-[color:var(--border)] rounded-xl p-4 text-center">
        <p className="text-xs text-[color:var(--muted)] mb-3">
          Made payment but facing issues? Contact us directly.
        </p>
        <button
          onClick={openWhatsApp}
          className="flex items-center justify-center gap-2 w-full bg-green-700/20 border border-green-700/40 text-green-400 font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-green-700/30 transition">
          <span>💬</span> Contact on WhatsApp
        </button>
        <p className="text-xs text-[color:var(--faint)] mt-2">
          We&apos;ll verify your payment and approve your entry manually.
        </p>
      </div>

      <p className="text-center text-xs text-[color:var(--faint)]">
        Your entry will be confirmed after admin verifies your payment (usually within 24 hours)
      </p>
    </div>
  )
}