// src/app/api/razorpay/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(request: NextRequest) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const { contestId, filmId, userId } = await request.json()

    const order = await razorpay.orders.create({
      amount: 29900,
      currency: 'INR',
      receipt: `cv_${contestId.substring(0, 8)}_${filmId.substring(0, 8)}`,
      notes: { contestId, filmId, userId },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })

  } catch (error: any) {
    console.error('Create order error:', error?.error?.description)
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}