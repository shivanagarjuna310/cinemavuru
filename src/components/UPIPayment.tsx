'use client'
// src/components/UPIPayment.tsx
// Shows QR code + UPI ID, user enters UTR after paying
// Admin verifies UTR manually and approves entry

import { useState } from 'react'
import Image from 'next/image'
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

  const UPI_ID = 'shivanagarjuna777@oksbi'

  async function handleSubmit() {
    if (!utrNumber.trim()) {
      onError('Please enter your UTR / Transaction ID.')
      return
    }
    if (utrNumber.trim().length < 8) {
      onError('UTR number looks too short. Please check and try again.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('contest_entries')
        .update({
          payment_ref:    utrNumber.trim(),
          payment_status: 'pending_verification', // Admin will verify
        })
        .eq('id', contestEntryId)

      if (error) throw error

      onSuccess()
    } catch (err: any) {
      onError('Could not save payment details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyUPI() {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">

      {/* Amount banner */}
      <div className="bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-xl p-4 text-center">
        <p className="text-xs text-[#7A6040] uppercase tracking-widest mb-1">Amount to Pay</p>
        <p className="text-3xl font-bold text-[#D4A017]">₹{entryFee}</p>
        <p className="text-xs text-[#4A3020] mt-1">Contest Entry Fee — Non-refundable</p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center">
        <p className="text-xs text-[#7A6040] uppercase tracking-widest mb-3">
          Scan QR to Pay
        </p>
        <div className="bg-white p-3 rounded-2xl shadow-lg">
          <Image
            src="/upi-qr.png"
            alt="UPI QR Code"
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
        <p className="text-xs text-[#7A6040] mt-3">
          Works with GPay, PhonePe, Paytm, any UPI app
        </p>
      </div>

      {/* UPI ID with copy */}
      <div className="bg-[#0D0A06] border border-[#2E2010] rounded-xl p-4">
        <p className="text-xs text-[#7A6040] uppercase tracking-widest mb-2">
          Or Pay using UPI ID
        </p>
        <div className="flex items-center justify-between gap-3">
          <code className="text-[#FDF6E3] text-sm font-mono">{UPI_ID}</code>
          <button
            onClick={copyUPI}
            className="text-xs bg-[#2E2010] hover:bg-[#3E3010] text-[#D4A017] px-3 py-1.5 rounded-lg transition whitespace-nowrap">
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[#0D0A06] border border-[#2E2010] rounded-xl p-4 space-y-2">
        <p className="text-xs text-[#D4A017] uppercase tracking-widest mb-3">How to Pay</p>
        {[
          'Open GPay, PhonePe, or any UPI app',
          `Scan QR or enter UPI ID: ${UPI_ID}`,
          `Pay exactly ₹${entryFee}`,
          'Copy the UTR / Transaction ID from the app',
          'Paste it below and submit',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#D4A017]/20 text-[#D4A017] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-[#7A6040] text-xs leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      {/* UTR Input */}
      <div>
        <label className="block text-xs text-[#7A6040] uppercase tracking-widest mb-1.5">
          UTR / Transaction ID *
        </label>
        <input
          type="text"
          value={utrNumber}
          onChange={e => setUtrNumber(e.target.value)}
          placeholder="e.g. 426813XXXXXXXX"
          className="w-full bg-[#0D0A06] border border-[#2E2010] rounded-lg px-4 py-3 text-[#FDF6E3] text-sm placeholder-[#4A3020] focus:outline-none focus:border-[#D4A017]/50 transition font-mono"
        />
        <p className="text-xs text-[#4A3020] mt-1">
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

      <p className="text-center text-xs text-[#4A3020]">
        Your entry will be confirmed after admin verifies your payment (usually within 24 hours)
      </p>
    </div>
  )
}