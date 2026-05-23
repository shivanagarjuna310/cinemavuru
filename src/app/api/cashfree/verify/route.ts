// src/app/api/cashfree/verify/route.ts
// After payment, browser calls this to confirm payment is real
// We check with Cashfree servers (can't be faked)
// Then update Supabase: payment_status = 'paid'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role key — can bypass Supabase security rules
// NEVER use this on the browser side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const appId = process.env.CASHFREE_APP_ID
    const secretKey = process.env.CASHFREE_SECRET_KEY

    if (!appId || !secretKey) {
      return NextResponse.json({ error: 'Cashfree keys not configured' }, { status: 500 })
    }

    const { orderId, contestEntryId } = await request.json()

    // Ask Cashfree: is this order actually paid?
    const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: 'Could not verify payment' }, { status: 500 })
    }

    // Only mark as paid if Cashfree confirms it
    if (data.order_status === 'PAID') {
      const { error } = await supabaseAdmin
        .from('contest_entries')
        .update({
          payment_status: 'paid',
          cashfree_order_id: orderId,
        })
        .eq('id', contestEntryId)

      if (error) {
        console.error('Supabase update error:', error)
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
      }

      return NextResponse.json({ success: true, status: 'PAID' })
    }

    // Payment not completed
    return NextResponse.json({ success: false, status: data.order_status })

  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}