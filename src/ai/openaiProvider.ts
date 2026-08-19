import { AIProviderError, type AIChatRequest, type AIChatResponse, type AIProvider } from './types'

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
  model?: string
}

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string

  constructor({ apiKey = '', model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini', baseUrl = 'https://api.openai.com/v1' } = {}) {
    this.apiKey = apiKey
    this.model = model
    this.baseUrl = baseUrl
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    if (!this.apiKey) throw new Error('OpenAI API key is not configured')
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model ?? this.model, messages: request.messages, max_tokens: request.maxOutputTokens, response_format: { type: 'json_object' } }),
    })
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new AIProviderError(`OpenAI request failed with status ${response.status}`, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined)
    }
    const data = await response.json() as OpenAIChatResponse
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) throw new AIProviderError('OpenAI returned an empty response')
    return { content, model: data.model }
  }
}
