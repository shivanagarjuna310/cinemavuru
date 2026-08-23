// src/app/api/cashfree/verify/route.ts
// After payment, browser calls this to confirm payment is real
// We check with Cashfree servers (can't be faked)
// Then update Supabase: payment_status = 'paid'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, notifyPaidEntry } from '@/lib/adminNotify'

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
      // Read the entry first so the admin alert (and the failure alert below)
      // can name the film and creator.
      const { data: entry } = await supabaseAdmin
        .from('contest_entries')
        .select('id, film_id, creator_id, contest_id')
        .eq('id', contestEntryId)
        .maybeSingle()

      const { error } = await supabaseAdmin
        .from('contest_entries')
        .update({
          payment_status: 'paid',
          cashfree_order_id: orderId,
        })
        .eq('id', contestEntryId)

      if (error) {
        console.error('Supabase update error:', error)
        // Money was taken but the entry did not flip to paid — needs a human.
        await notifyAdmins({
          kind: 'payment_recorded_failed',
          tone: 'danger',
          subject: 'PAID but not recorded — contest entry needs a manual fix',
          heading: 'Payment taken, entry not updated',
          intro:
            'Cashfree confirmed a payment but the contest entry could not be marked paid. Fix this entry by hand so the creator is not charged for nothing.',
          rows: [
            ['Order ID', String(orderId ?? '—')],
            ['Entry ID', String(contestEntryId ?? '—')],
            ['Amount', data.order_amount != null ? `Rs.${data.order_amount}` : '—'],
            ['DB error', error.message],
          ],
          ctaLabel: 'Open contest entries',
        }).catch(() => {})
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 })
      }

      await notifyPaidEntry({
        filmId:    entry?.film_id    ?? undefined,
        userId:    entry?.creator_id ?? undefined,
        contestId: entry?.contest_id ?? undefined,
        gateway:   'Cashfree',
        reference: String(orderId ?? ''),
        amount:    typeof data.order_amount === 'number' ? data.order_amount : undefined,
      })

      return NextResponse.json({ success: true, status: 'PAID' })
    }

    // Payment not completed
    return NextResponse.json({ success: false, status: data.order_status })

  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}