import { NextResponse } from 'next/server'
import { defaultAIProvider, isAIProviderId, type AIProviderId } from '../../../../src/ai/providerOptions'
import { encryptAIKey } from '../../../../src/server/aiKeyVault'
import { getUserAISettings, removeUserAIKey, saveUserAISettings, verifySupabaseUser } from '../../../../src/server/supabaseAdmin'

function summary(settings: Awaited<ReturnType<typeof getUserAISettings>>) {
  const provider = settings?.provider ?? defaultAIProvider()
  return { provider, groqConfigured: Boolean(settings?.groq_key_ciphertext), openaiConfigured: Boolean(settings?.openai_key_ciphertext), usesCloudflareCredits: provider === 'cloudflare' }
}

export async function GET(request: Request) {
  const user = await verifySupabaseUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  return NextResponse.json(summary(await getUserAISettings(user.id)), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request) {
  const user = await verifySupabaseUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const body = await request.json() as { provider?: unknown; apiKey?: unknown }
  if (!isAIProviderId(body.provider)) return NextResponse.json({ error: 'Choose a valid AI provider.' }, { status: 400 })
  const provider = body.provider as AIProviderId
  const current = await getUserAISettings(user.id)
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (provider !== 'cloudflare' && !apiKey && !(provider === 'groq' ? current?.groq_key_ciphertext : current?.openai_key_ciphertext)) {
    return NextResponse.json({ error: `Add your ${provider === 'groq' ? 'Groq' : 'OpenAI'} API key to use this provider.` }, { status: 400 })
  }
  if (apiKey && (apiKey.length < 12 || apiKey.length > 500)) return NextResponse.json({ error: 'The API key length is not valid.' }, { status: 400 })
  await saveUserAISettings(user.id, {
    provider,
    ...(provider === 'groq' && apiKey ? { groq_key_ciphertext: await encryptAIKey(apiKey) } : {}),
    ...(provider === 'openai' && apiKey ? { openai_key_ciphertext: await encryptAIKey(apiKey) } : {}),
  })
  return NextResponse.json(summary(await getUserAISettings(user.id)))
}

export async function DELETE(request: Request) {
  const user = await verifySupabaseUser(request)
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const body = await request.json() as { provider?: unknown }
  if (body.provider !== 'groq' && body.provider !== 'openai') return NextResponse.json({ error: 'Only external provider keys can be removed.' }, { status: 400 })
  const current = await getUserAISettings(user.id)
  await removeUserAIKey(user.id, body.provider)
  if (current?.provider === body.provider) await saveUserAISettings(user.id, { provider: 'cloudflare' })
  return NextResponse.json(summary(await getUserAISettings(user.id)))
}
