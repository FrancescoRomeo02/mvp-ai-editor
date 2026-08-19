import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { CloudflareBindings } from '../../../../src/cloudflare/bindings'
import { getUserBonusCredits, verifySupabaseUser } from '../../../../src/server/supabaseAdmin'
import { getUserAISettings } from '../../../../src/server/supabaseAdmin'
import { defaultAIProvider } from '../../../../src/ai/providerOptions'

function requestConfig() {
  return {
    creditsPerDay: Number(process.env.AI_CREDITS_PER_DAY ?? 20),
    requestsPerMinute: Number(process.env.AI_REQUESTS_PER_MINUTE ?? 5),
  }
}

export async function GET(request: Request) {
  const user = await verifySupabaseUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const config = requestConfig()
  const settings = await getUserAISettings(user.id)
  const provider = settings?.provider ?? defaultAIProvider()
  if (provider === 'cloudflare') {
    try {
      const { env: rawEnv } = await getCloudflareContext({ async: true })
      const env = rawEnv as unknown as CloudflareBindings
      const status = await env.USAGE.getByName(user.id).getStatus({
        ...config,
        bonusCredits: await getUserBonusCredits(user.id),
        nowMs: Date.now(),
        dayKey: new Date().toISOString().slice(0, 10),
      })
      return NextResponse.json({ ...status, provider: 'cloudflare', usesCloudflareCredits: true, aiEnabled: process.env.AI_ENABLED !== 'false' }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json({ error: 'Cloudflare usage is not available yet.' }, { status: 503 })
    }
  }

  return NextResponse.json({ creditsUsedToday: null, creditsRemaining: null, bonusCreditsRemaining: null, requestsInWindow: null, dailyLimit: null, requestsPerMinute: null, dayResetsAt: null, windowResetsAt: null, provider, usesCloudflareCredits: false, aiEnabled: process.env.AI_ENABLED !== 'false' }, { headers: { 'Cache-Control': 'no-store' } })
}
