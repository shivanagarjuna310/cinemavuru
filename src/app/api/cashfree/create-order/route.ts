// src/app/api/cashfree/create-order/route.ts
// This runs on the SERVER only (never exposed to browser)
// It calls Cashfree API to create a payment session
// Cashfree gives back a "payment_session_id" which opens the payment popup

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID
    const secretKey = process.env.CASHFREE_SECRET_KEY

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: 'Cashfree keys not configured' },
        { status: 500 }
      )
    }

    const { contestId, filmId, userId, userEmail, userName, userPhone } = await request.json()

    // Create a unique order ID (Cashfree requires this)
    const orderId = `cv_${contestId.substring(0, 6)}_${filmId.substring(0, 6)}_${Date.now()}`

    // Call Cashfree API to create order
    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: 299,           // ₹299 entry fee
        order_currency: 'INR',
        customer_details: {
          customer_id: userId,
          customer_email: userEmail || 'filmmaker@cinemavuru.com',
          customer_name: userName || 'Filmmaker',
          customer_phone: userPhone || '9999999999',
        },
        order_meta: {
          // After payment, Cashfree redirects here
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/contest/enter?order_id={order_id}&status={order_status}`,
        },
        order_note: `CinemaVuru Contest Entry - Film ${filmId}`,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Cashfree error:', data)
      return NextResponse.json(
        { error: data.message || 'Failed to create order' },
        { status: 500 }
      )
    }

    // Save order details to Supabase so we can verify later
    // We return the session ID to the browser — it opens the payment popup
    return NextResponse.json({
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      amount: data.order_amount,
    })

  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment order', details: error?.message },
      { status: 500 }
    )
  }
}