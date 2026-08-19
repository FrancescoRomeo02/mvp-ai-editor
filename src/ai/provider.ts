import { RotatingGroqProvider } from './groqProvider'
import { CloudflareAIProvider } from './cloudflareProvider'
import { OpenAIProvider } from './openaiProvider'
import type { AIProvider } from './types'
import type { AIProviderId } from './providerOptions'

export function createAIProvider({ provider = (process.env.AI_PROVIDER ?? 'groq') as AIProviderId, apiKey }: { provider?: AIProviderId; apiKey?: string } = {}): AIProvider {
  switch (provider) {
    case 'groq':
      return apiKey ? new RotatingGroqProvider([apiKey]) : new RotatingGroqProvider()
    case 'cloudflare':
      return new CloudflareAIProvider()
    case 'openai':
      return new OpenAIProvider({ apiKey })
    default:
      throw new Error(`Unsupported AI provider: ${process.env.AI_PROVIDER}`)
  }
}
