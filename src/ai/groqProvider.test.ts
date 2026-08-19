import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroqProvider } from './groqProvider'

describe('GroqProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps a Groq chat completion to the provider response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      model: 'test-model',
      choices: [{ message: { content: '  A useful answer.  ' } }],
    }), { status: 200 }))

    const result = await new GroqProvider({ apiKey: 'test-key', model: 'test-model' }).chat({
      messages: [{ role: 'user', content: 'Hello' }],
    })

    expect(result).toEqual({ content: 'A useful answer.', model: 'test-model' })
    expect(fetchMock).toHaveBeenCalledWith('https://api.groq.com/openai/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }))
  })

  it('fails clearly when the API key is missing', async () => {
    await expect(new GroqProvider({ apiKey: '' }).chat({ messages: [] })).rejects.toThrow('GROQ_API_KEY is not configured')
  })
})
