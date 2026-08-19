import * as logfire from 'logfire'

export type AIRequestEvent = {
  id: string
  timestamp: string
  outcome: 'success' | 'error' | 'rejected'
  status: number
  provider: string
  model?: string
  latencyMs: number
  inputMessages: number
  inputChars: number
  outputChars: number
  creditsConsumed: number
  userId?: string
  clientId: string
  errorType?: string
}

const MAX_EVENTS = 500
const events: AIRequestEvent[] = []

export function recordAIRequest(event: AIRequestEvent) {
  events.push(event)
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)

  if (process.env.AI_OBSERVABILITY_LOGS !== 'false' && process.env.NODE_ENV !== 'test') {
    console.info(JSON.stringify({
      event: 'ai.request',
      requestId: event.id,
      timestamp: event.timestamp,
      outcome: event.outcome,
      status: event.status,
      provider: event.provider,
      model: event.model,
      latencyMs: event.latencyMs,
      inputMessages: event.inputMessages,
      inputChars: event.inputChars,
      outputChars: event.outputChars,
      creditsConsumed: event.creditsConsumed,
      userId: event.userId,
      clientId: event.clientId,
      errorType: event.errorType,
    }))
  }
}

export function withAIProviderSpan<T>(attributes: Record<string, unknown>, callback: () => Promise<T>) {
  return logfire.span('AI provider request', {
    attributes: { 'ai.operation': 'chat', ...attributes },
    tags: ['ai', 'provider'],
    callback,
  })
}

function percentile(values: number[], percentage: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)]
}

export function getAIUsageSnapshot() {
  const latencyValues = events.map((event) => event.latencyMs)
  const successful = events.filter((event) => event.outcome === 'success')
  const totalRequests = events.length

  return {
    generatedAt: new Date().toISOString(),
    window: 'current-isolate-last-500-events',
    totals: {
      requests: totalRequests,
      successful: successful.length,
      errors: events.filter((event) => event.outcome === 'error').length,
      rejected: events.filter((event) => event.outcome === 'rejected').length,
      creditsConsumed: events.reduce((sum, event) => sum + event.creditsConsumed, 0),
      inputChars: events.reduce((sum, event) => sum + event.inputChars, 0),
      outputChars: events.reduce((sum, event) => sum + event.outputChars, 0),
      averageLatencyMs: totalRequests === 0 ? 0 : Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / totalRequests),
      p95LatencyMs: percentile(latencyValues, 0.95),
    },
    byModel: Object.entries(events.reduce<Record<string, AIRequestEvent[]>>((groups, event) => {
      const model = event.model ?? 'unknown'
      groups[model] ??= []
      groups[model].push(event)
      return groups
    }, {})).map(([model, modelEvents]) => ({
      model,
      requests: modelEvents.length,
      successful: modelEvents.filter((event) => event.outcome === 'success').length,
      errors: modelEvents.filter((event) => event.outcome === 'error').length,
      rejected: modelEvents.filter((event) => event.outcome === 'rejected').length,
      creditsConsumed: modelEvents.reduce((sum, event) => sum + event.creditsConsumed, 0),
    })),
    recent: [...events].reverse().slice(0, 100),
  }
}

export function hashClientId(clientId: string) {
  return clientId.length > 12 ? `${clientId.slice(0, 6)}…${clientId.slice(-4)}` : 'anonymous'
}
