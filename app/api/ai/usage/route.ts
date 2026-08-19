import { NextResponse } from 'next/server'
import { getAIUsageSnapshot } from '../../../../src/ai/observability'
import { isAIObservabilityAdmin, verifySupabaseUser } from '../../../../src/server/supabaseAdmin'

export async function GET(request: Request) {
  const user = await verifySupabaseUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  if (!isAIObservabilityAdmin(user.id)) return NextResponse.json({ error: 'AI observability is restricted.' }, { status: 403 })

  return NextResponse.json(getAIUsageSnapshot(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
