// src/app/api/email/creator-email/route.ts
// Securely fetches a user's email using service role key
// Only called from server-side, never exposed to browser

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Service role can access auth.admin — regular client cannot
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !data?.user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ email: data.user.email })

  } catch (error: any) {
    console.error('creator-email error:', error)
    return NextResponse.json({ error: 'Failed to get email' }, { status: 500 })
  }
}