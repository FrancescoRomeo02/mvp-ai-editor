'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/auth/AuthProvider'
import { getSupabaseAccessToken } from '../../src/lib/supabase'

type CreditStatus = {
  creditsUsedToday: number | null
  creditsRemaining: number | null
  bonusCreditsRemaining: number | null
  requestsInWindow: number | null
  dailyLimit: number | null
  requestsPerMinute: number | null
  dayResetsAt: string | null
  windowResetsAt: string | null
  provider: string
  usesCloudflareCredits: boolean
  aiEnabled: boolean
}

type AISettings = { provider: 'cloudflare' | 'groq' | 'openai'; groqConfigured: boolean; openaiConfigured: boolean; usesCloudflareCredits: boolean }

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

export default function UserPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [status, setStatus] = useState<CreditStatus | null>(null)
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<AISettings['provider']>('cloudflare')
  const [apiKey, setApiKey] = useState('')
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.replace('/login'); return }
    if (!user) return
    let cancelled = false
    void (async () => {
      try {
        const token = await getSupabaseAccessToken()
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const [creditsResponse, settingsResponse] = await Promise.all([fetch('/api/user/credits', { headers }), fetch('/api/user/ai-settings', { headers })])
        const data = await creditsResponse.json() as CreditStatus & { error?: string }
        const settingsData = await settingsResponse.json() as AISettings & { error?: string }
        if (!creditsResponse.ok) throw new Error(data.error ?? 'Unable to load credit information.')
        if (!settingsResponse.ok) throw new Error(settingsData.error ?? 'Unable to load AI settings.')
        if (!cancelled) { setStatus(data); setSettings(settingsData); setSelectedProvider(settingsData.provider) }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Unable to load credit information.')
      }
    })()
    return () => { cancelled = true }
  }, [loading, router, user])

  async function saveSettings() {
    setSettingsBusy(true); setSettingsMessage(null)
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/user/ai-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() || undefined }) })
      const data = await response.json() as AISettings & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to save AI settings.')
      setSettings(data); setApiKey(''); setSettingsMessage('AI provider updated.')
      const refreshed = await fetch('/api/user/credits', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (refreshed.ok) setStatus(await refreshed.json() as CreditStatus)
    } catch (caught) { setSettingsMessage(caught instanceof Error ? caught.message : 'Unable to save AI settings.') }
    finally { setSettingsBusy(false) }
  }

  async function removeKey(provider: 'groq' | 'openai') {
    setSettingsBusy(true); setSettingsMessage(null)
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/user/ai-settings', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ provider }) })
      const data = await response.json() as AISettings & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to remove API key.')
      setSettings(data); if (selectedProvider === provider) setSelectedProvider('cloudflare'); setSettingsMessage('API key removed.')
    } catch (caught) { setSettingsMessage(caught instanceof Error ? caught.message : 'Unable to remove API key.') }
    finally { setSettingsBusy(false) }
  }

  if (loading || !user) return <main className="projects-page" aria-busy="true"><p className="loading-message">Loading your account…</p></main>

  return (
    <main className="user-page">
      <section className="user-panel" aria-labelledby="user-title">
        <header className="user-header">
          <div><p className="project-setup-kicker">ACCOUNT</p><h1 id="user-title">Your account</h1><p className="user-email">{user.email}</p></div>
          <nav className="user-actions" aria-label="Account navigation"><Link className="text-button" href="/">Back to projects</Link><button className="text-button" type="button" onClick={() => void signOut()}>Sign out</button></nav>
        </header>

        <section className="credits-section" aria-labelledby="credits-title">
          <div className="section-heading"><div><p className="section-label">USAGE</p><h2 id="credits-title">AI credits</h2></div>{status ? <span className={`status-pill ${status.aiEnabled ? 'is-active' : 'is-paused'}`}>{status.aiEnabled ? 'Available' : 'Paused'}</span> : null}</div>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {!status && !error ? <div className="credits-skeleton" aria-label="Loading credit information" /> : null}
          {status ? <>
            {status.usesCloudflareCredits ? <><div className="credit-balance"><strong>{status.creditsRemaining}</strong><span>credits remaining</span></div>
            <div className="credit-details">
              <div><span>Used today</span><strong>{status.creditsUsedToday} / {status.dailyLimit}</strong></div>
              <div><span>Bonus credits</span><strong>{status.bonusCreditsRemaining}</strong></div>
              <div><span>Requests this minute</span><strong>{status.requestsInWindow} / {status.requestsPerMinute}</strong></div>
            </div>
            <p className="credits-note">Daily credits reset {formatDate(status.dayResetsAt)}. The per-minute request limit resets {formatDate(status.windowResetsAt)}.</p></> : <p className="credits-notice">Using your {status.provider} API key. Requests do not consume the project’s Cloudflare credits.</p>}
            {!status.aiEnabled ? <p className="credits-notice">AI is currently paused while the deployment is being configured.</p> : null}
          </> : null}
        </section>

        <section className="provider-section" aria-labelledby="provider-title">
          <div className="section-heading"><div><p className="section-label">PREFERENCES</p><h2 id="provider-title">AI provider</h2></div></div>
          <p className="provider-copy">Choose the provider used for your requests. Cloudflare is the shared project provider; Groq and OpenAI use your own key.</p>
          <label className="provider-field">Provider<select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value as AISettings['provider'])}><option value="cloudflare">Cloudflare — uses shared credits</option><option value="groq">Groq — use my API key</option><option value="openai">OpenAI — use my API key</option></select></label>
          {selectedProvider !== 'cloudflare' ? <><label className="provider-field">{selectedProvider === 'groq' ? 'Groq' : 'OpenAI'} API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={(selectedProvider === 'groq' ? settings?.groqConfigured : settings?.openaiConfigured) ? 'Configured — enter a new key to replace it' : 'Paste your API key'} autoComplete="off" /></label><p className="provider-security">Your key is encrypted and stored server-side. It is never returned to the browser.</p><div className="provider-actions">{(selectedProvider === 'groq' ? settings?.groqConfigured : settings?.openaiConfigured) ? <button className="text-button" type="button" onClick={() => void removeKey(selectedProvider)}>Remove key</button> : null}</div></> : null}
          {settingsMessage ? <p className="provider-message" role="status">{settingsMessage}</p> : null}<button className="primary-button provider-save" type="button" disabled={settingsBusy} onClick={() => void saveSettings()}>{settingsBusy ? 'Saving…' : 'Save provider'}</button>
        </section>

        <section className="account-details" aria-labelledby="account-details-title"><h2 id="account-details-title">Account details</h2><dl><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>AI provider</dt><dd>{status?.provider ?? 'Loading…'}</dd></div><div><dt>Member since</dt><dd>{user.created_at ? formatDate(user.created_at) : '—'}</dd></div></dl></section>
      </section>
    </main>
  )
}
