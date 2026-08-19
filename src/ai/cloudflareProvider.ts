import { getCloudflareContext } from '@opennextjs/cloudflare'
import { AIProviderError, type AIChatRequest, type AIChatResponse, type AIProvider } from './types'
import type { CloudflareBindings } from '../cloudflare/bindings'

type WorkersAIResponse = {
  response?: string
}

export class CloudflareAIProvider implements AIProvider {
  private readonly model: string

  constructor(model = process.env.CF_AI_MODEL ?? '@cf/meta/llama-3.2-3b-instruct') {
    this.model = model
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const { env: rawEnv } = await getCloudflareContext({ async: true })
    const env = rawEnv as unknown as CloudflareBindings
    if (!env?.AI) throw new Error('Cloudflare Workers AI binding is not configured')

    try {
      const result = await env.AI.run(request.model ?? this.model, {
        messages: request.messages,
        max_tokens: request.maxOutputTokens,
      }) as WorkersAIResponse
      const content = result.response?.trim()
      if (!content) throw new AIProviderError('Workers AI returned an empty response')
      return { content, model: request.model ?? this.model }
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      throw new AIProviderError(error instanceof Error ? error.message : 'Workers AI request failed')
    }
  }
}
