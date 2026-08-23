// src/app/api/razorpay/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmins, notifyPaidEntry } from '@/lib/adminNotify'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      contestId,
      filmId,
      userId,
    } = await request.json()

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      // A bad signature is either a misconfigured key or someone faking a
      // payment — admins should know. Throttled so it can't be used to flood
      // inboxes.
      await notifyAdmins({
        kind: 'payment_signature_failed',
        tone: 'danger',
        subject: 'Razorpay signature verification FAILED',
        heading: 'Payment verification failed',
        intro:
          'A Razorpay callback arrived with a signature that does not match. This is either a wrong RAZORPAY_KEY_SECRET or a forged payment attempt. The entry was <b>not</b> marked paid.',
        rows: [
          ['Order ID', razorpay_order_id ?? '—'],
          ['Payment ID', razorpay_payment_id ?? '—'],
          ['Contest', contestId ?? '—'],
          ['Film', filmId ?? '—'],
          ['User', userId ?? '—'],
        ],
        ctaLabel: 'Check contest entries',
        throttleMinutes: 30,
      }).catch(() => {})

      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Update Supabase
    const { error } = await supabaseAdmin
      .from('contest_entries')
      .update({
        payment_status: 'paid',
        razorpay_order_id,
        razorpay_payment_id,
      })
      .eq('contest_id', contestId)
      .eq('film_id', filmId)
      .eq('creator_id', userId)

    if (error) {
      // Money was taken but the entry did not flip to paid — needs a human.
      await notifyAdmins({
        kind: 'payment_recorded_failed',
        tone: 'danger',
        subject: 'PAID but not recorded — contest entry needs a manual fix',
        heading: 'Payment taken, entry not updated',
        intro:
          'Razorpay confirmed a payment but the contest entry could not be marked paid. Fix this entry by hand so the creator is not charged for nothing.',
        rows: [
          ['Order ID', razorpay_order_id ?? '—'],
          ['Payment ID', razorpay_payment_id ?? '—'],
          ['Contest', contestId ?? '—'],
          ['Film', filmId ?? '—'],
          ['User', userId ?? '—'],
          ['DB error', error.message],
        ],
        ctaLabel: 'Open contest entries',
      }).catch(() => {})

      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    await notifyPaidEntry({
      filmId,
      userId,
      contestId,
      gateway: 'Razorpay',
      reference: razorpay_payment_id,
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
