import { AIProviderError, type AIChatRequest, type AIChatResponse, type AIProvider } from './types'

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
  model?: string
}

export class GroqProvider implements AIProvider {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string

  constructor({
    apiKey = process.env.GROQ_API_KEY ?? '',
    model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    baseUrl = 'https://api.groq.com/openai/v1',
  } = {}) {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    if (!this.apiKey) throw new Error('GROQ_API_KEY is not configured')

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model ?? this.model,
        messages: request.messages,
        max_tokens: request.maxOutputTokens,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new AIProviderError(`Groq request failed with status ${response.status}`, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined)
    }

    const data = await response.json() as GroqChatResponse
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw new AIProviderError('Groq returned an empty response')

    return { content, model: data.model }
  }
}

export class RotatingGroqProvider implements AIProvider {
  private readonly providers: GroqProvider[]
  private nextProvider = 0

  constructor(keys = process.env.GROQ_API_KEYS?.split(',').map((key) => key.trim()).filter(Boolean) ?? []) {
    const fallbackKey = process.env.GROQ_API_KEY
    const configuredKeys = keys.length > 0 ? keys : fallbackKey ? [fallbackKey] : []
    this.providers = configuredKeys.map((apiKey) => new GroqProvider({ apiKey }))
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    if (this.providers.length === 0) throw new Error('GROQ_API_KEY or GROQ_API_KEYS is not configured')

    let lastError: unknown
    for (let attempt = 0; attempt < this.providers.length; attempt += 1) {
      const provider = this.providers[this.nextProvider]
      this.nextProvider = (this.nextProvider + 1) % this.providers.length
      try {
        return await provider.chat(request)
      } catch (error) {
        lastError = error
        if (!(error instanceof AIProviderError) || ![401, 429].includes(error.status ?? 0)) throw error
      }
    }
    throw lastError
  }
}
