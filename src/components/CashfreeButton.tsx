// src/components/CashfreeButton.tsx
// This is the "Pay ₹299" button users see
// Flow:
// 1. Calls your server → gets payment_session_id
// 2. Opens Cashfree payment popup (UPI, cards, netbanking)
// 3. After payment → calls verify route → updates Supabase
// 4. Calls onSuccess() → parent component shows success screen

'use client'

import { useState } from 'react'

interface CashfreeButtonProps {
  contestId: string
  filmId: string
  userId: string
  userEmail: string
  userName: string
  contestEntryId: string        // The DB row ID created before payment
  onSuccess: () => void         // Called after payment verified
  onError: (msg: string) => void
}

export default function CashfreeButton({
  contestId,
  filmId,
  userId,
  userEmail,
  userName,
  contestEntryId,
  onSuccess,
  onError,
}: CashfreeButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handlePayment() {
    setLoading(true)
    try {
      // Step 1: Create order on your server
      const orderRes = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestId,
          filmId,
          userId,
          userEmail,
          userName,
          userPhone: '9999999999', // Optional — can collect from profile later
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order')

      // Step 2: Load Cashfree SDK and open payment popup
      const cashfree = await loadCashfree()

      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_modal', // Opens as popup, not full redirect
      }

      cashfree.checkout(checkoutOptions).then(async (result: any) => {
        if (result.error) {
          onError(result.error.message || 'Payment failed')
          setLoading(false)
          return
        }

        if (result.paymentDetails) {
          // Step 3: Verify with your server
          const verifyRes = await fetch('/api/cashfree/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.orderId,
              contestEntryId,
            }),
          })

          const verifyData = await verifyRes.json()

          if (verifyData.success) {
            onSuccess() // 🎉 Payment confirmed!
          } else {
            onError('Payment could not be verified. Please contact support.')
          }
        }

        setLoading(false)
      })

    } catch (err: any) {
      console.error('Payment error:', err)
      onError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-gradient-to-r from-[#FF6B1A] to-[#D4A017] text-black font-bold py-3 px-6 rounded-xl uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition">
      {loading ? '⏳ Opening Payment...' : '💳 Pay ₹299 — Confirm Entry'}
    </button>
  )
}

// Dynamically loads the Cashfree JS SDK
function loadCashfree(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Cashfree) {
      resolve(
        (window as any).Cashfree({
          mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
        })
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    script.onload = () => {
      resolve(
        (window as any).Cashfree({
          mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox',
        })
      )
    }
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
    document.head.appendChild(script)
  })
}