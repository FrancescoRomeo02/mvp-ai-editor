import { createClient } from '@supabase/supabase-js'
import type { AIProviderId } from '../ai/providerOptions'

export type UserAISettingsRecord = {
  provider: AIProviderId
  groq_key_ciphertext: string | null
  openai_key_ciphertext: string | null
}

export function requireSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Supabase server storage is not configured.')
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function getBearerToken(request: Request) {
  const value = request.headers.get('authorization')
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null
}

export function isAIObservabilityAdmin(userId: string) {
  const adminIds = (process.env.AI_OBSERVABILITY_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return adminIds.includes(userId)
}

export async function verifySupabaseUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = getBearerToken(request)
  if (!url || !anonKey || !token) return null
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await client.auth.getUser(token)
  return error ? null : data.user
}

export async function getUserBonusCredits(userId: string) {
  const { data, error } = await requireSupabaseAdmin()
    .from('user_ai_credits')
    .select('bonus_credits')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Unable to read AI credits: ${error.message}`)
  return data?.bonus_credits ?? 0
}

export async function getUserAISettings(userId: string) {
  const { data, error } = await requireSupabaseAdmin()
    .from('user_ai_settings')
    .select('provider, groq_key_ciphertext, openai_key_ciphertext')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Unable to read AI settings: ${error.message}`)
  return data as UserAISettingsRecord | null
}

export async function saveUserAISettings(userId: string, settings: Partial<Omit<UserAISettingsRecord, never>> & { provider: AIProviderId }) {
  const current = await getUserAISettings(userId)
  const { error } = await requireSupabaseAdmin().from('user_ai_settings').upsert({
    user_id: userId,
    provider: settings.provider,
    groq_key_ciphertext: settings.groq_key_ciphertext ?? current?.groq_key_ciphertext ?? null,
    openai_key_ciphertext: settings.openai_key_ciphertext ?? current?.openai_key_ciphertext ?? null,
  }, { onConflict: 'user_id' })
  if (error) throw new Error(`Unable to save AI settings: ${error.message}`)
}

export async function removeUserAIKey(userId: string, provider: Exclude<AIProviderId, 'cloudflare'>) {
  const column = provider === 'groq' ? 'groq_key_ciphertext' : 'openai_key_ciphertext'
  const { error } = await requireSupabaseAdmin().from('user_ai_settings').update({ [column]: null }).eq('user_id', userId)
  if (error) throw new Error(`Unable to remove AI key: ${error.message}`)
}
