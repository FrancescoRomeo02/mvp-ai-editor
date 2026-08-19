'use client'

import { useEffect, useState } from 'react'
import { getSupabaseAccessToken } from '../../../src/lib/supabase'

type UsageSnapshot = {
  generatedAt: string
  window: string
  totals: Record<string, number>
  byModel: Array<{ model: string; requests: number; successful: number; errors: number; rejected: number; creditsConsumed: number }>
  recent: Array<{ id: string; timestamp: string; outcome: string; status: number; model?: string; latencyMs: number; inputChars: number; outputChars: number; userId?: string; errorType?: string }>
}

export default function AIObservabilityPage() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const token = await getSupabaseAccessToken()
        const response = await fetch('/api/ai/usage', {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!response.ok) throw new Error('Unable to load AI usage.')
        const data = await response.json() as UsageSnapshot
        if (active) { setSnapshot(data); setError(null) }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load AI usage.')
      }
    }
    void load()
    const timer = window.setInterval(load, 10_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  return (
    <main className="ai-observability-page">
      <header>
        <p className="eyebrow">Developer tools</p>
        <h1>AI usage</h1>
        <p>Dev-only telemetry for the current server isolate. Prompts and responses are never stored here.</p>
      </header>
      {error && <p role="alert" className="ai-chat-error">{error}</p>}
      {snapshot && <>
        <div className="ai-observability-cards">
          <article><strong>{snapshot.totals.requests}</strong><span>Requests</span></article>
          <article><strong>{snapshot.totals.successful}</strong><span>Successful</span></article>
          <article><strong>{snapshot.totals.errors + snapshot.totals.rejected}</strong><span>Errors / rejected</span></article>
          <article><strong>{snapshot.totals.averageLatencyMs} ms</strong><span>Average latency</span></article>
          <article><strong>{snapshot.totals.p95LatencyMs} ms</strong><span>P95 latency</span></article>
          <article><strong>{snapshot.totals.creditsConsumed}</strong><span>Credits consumed</span></article>
        </div>
        <p className="ai-observability-meta">Updated {new Date(snapshot.generatedAt).toLocaleTimeString()} · {snapshot.window}</p>
        <section className="ai-observability-section"><h2>Models</h2><pre>{JSON.stringify(snapshot.byModel, null, 2)}</pre></section>
        <section className="ai-observability-section"><h2>Recent requests</h2><div className="ai-observability-table-wrap"><table><thead><tr><th>Time</th><th>Outcome</th><th>Model</th><th>Latency</th><th>Input</th><th>Output</th><th>User</th><th>Error</th></tr></thead><tbody>{snapshot.recent.map((event) => <tr key={event.id}><td>{new Date(event.timestamp).toLocaleTimeString()}</td><td>{event.outcome} ({event.status})</td><td>{event.model ?? '—'}</td><td>{event.latencyMs} ms</td><td>{event.inputChars}</td><td>{event.outputChars}</td><td>{event.userId ?? event.id.slice(0, 8)}</td><td>{event.errorType ?? '—'}</td></tr>)}</tbody></table></div></section>
      </>}
    </main>
  )
}
