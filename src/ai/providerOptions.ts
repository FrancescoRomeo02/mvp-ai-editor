export type AIProviderId = 'cloudflare' | 'groq' | 'openai'

export function defaultAIProvider(): AIProviderId {
  if (process.env.AI_PROVIDER === 'cloudflare') return 'cloudflare'
  if (process.env.AI_PROVIDER === 'openai') return 'openai'
  return 'groq'
}

export function isAIProviderId(value: unknown): value is AIProviderId {
  return value === 'cloudflare' || value === 'groq' || value === 'openai'
}
