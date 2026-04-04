'use client'

import { useState } from 'react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface RazorpayButtonProps {
  contestId: string
  filmId: string
  userId: string
  userEmail: string
  userName: string
  onSuccess: () => void
}

export default function RazorpayButton({
  contestId,
  filmId,
  userId,
  userEmail,
  userName,
  onSuccess,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePayment = async () => {
    setLoading(true)
    setError('')

    try {
      // STEP 1: Load script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Check your internet.')
        setLoading(false)
        return
      }

      // STEP 2: Create order
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId, filmId, userId }),
      })

      if (!orderResponse.ok) {
        const errData = await orderResponse.json()
        console.error('Order creation failed:', errData)
        setError('Failed to create payment order. Try again.')
        setLoading(false)
        return
      }

      const orderData = await orderResponse.json()
      console.log('Order created:', orderData) // DEBUG

      // STEP 3: Open Razorpay popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CinemaVuru',
        description: 'Contest Entry Fee',
        order_id: orderData.orderId, // ✅ must match what create-order returns

        // ✅ This is the critical handler — runs after successful payment
        handler: function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          console.log('Payment response from Razorpay:', response) // DEBUG

          // ✅ Now send all 3 values + our IDs to verify route
          fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              contestId,
              filmId,
              userId,
            }),
          })
            .then(res => {
              console.log('Verify response status:', res.status) // DEBUG
              return res.json()
            })
            .then(data => {
              console.log('Verify response data:', data) // DEBUG
              if (data.success) {
                onSuccess()
              } else {
                setError('Payment verification failed. Contact support.')
              }
              setLoading(false)
            })
            .catch(err => {
              console.error('Verify fetch error:', err)
              setError('Verification error. Contact support.')
              setLoading(false)
            })
        },

        prefill: {
          name: userName,
          email: userEmail,
        },

        theme: {
          color: '#FF6B1A',
        },

        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      console.log('Opening Razorpay with options:', {
        key: options.key,
        amount: options.amount,
        order_id: options.order_id,
      }) // DEBUG

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()

    } catch (err) {
      console.error('Payment error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-3 px-6 rounded-lg font-bold text-white transition-all"
        style={{
          background: loading
            ? '#666'
            : 'linear-gradient(135deg, #FF6B1A, #D4A017)',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Processing...' : '🎬 Pay Rs 299 & Enter Contest'}
      </button>

      {error && (
        <p className="mt-2 text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  )
}