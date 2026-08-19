'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/auth/AuthProvider'
import { requireSupabase } from '../../src/lib/supabase'
import { AuthShell } from '../login/page'

const SERVICE_NOTICE_VERSION = '2026-08-19'

export default function RegisterPage() {
  const router = useRouter(); const { configured } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [promoCode, setPromoCode] = useState(''); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null); setMessage(null)
    try { const { data, error: signUpError } = await requireSupabase().auth.signUp({ email, password, options: { data: { promo_code: promoCode.trim().toUpperCase() || null, service_notice_version: SERVICE_NOTICE_VERSION, service_notice_acknowledged_at: new Date().toISOString() } } }); if (signUpError) throw signUpError; if (data.session) router.replace('/'); else setMessage('Account created. Check your email to confirm it, then sign in.') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create your account.') }
    finally { setSubmitting(false) }
  }
  return <AuthShell eyebrow="New workspace" title="Start with a clean page." description="Create a private workspace for your papers, files, and research notes.">
    {!configured ? <p className="auth-error" role="alert">Add the Supabase environment variables to enable registration.</p> : <form className="auth-form" aria-describedby="registration-notice" onSubmit={submit}>
      <label htmlFor="register-email">Email<input id="register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label htmlFor="register-password">Password<input id="register-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label htmlFor="register-promo">Bonus code <span className="field-hint">optional</span><input id="register-promo" type="text" autoComplete="off" spellCheck="false" placeholder="Enter a bonus code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} /></label>
      <section className="auth-disclaimer" id="registration-notice" aria-labelledby="registration-notice-title">
        <h2 id="registration-notice-title">Before you create an account</h2>
        <p>This is an early-stage research tool. By using it, you acknowledge that:</p>
        <ul>
          <li>Your account and project files are stored by the services configured for this deployment.</li>
          <li>When you use the AI assistant, your messages are sent to the configured AI provider. AI output can be inaccurate and is not professional, legal, medical, or research advice.</li>
          <li>Do not upload confidential, personal, restricted, or unpublished material unless you have the right to process it with this service and its providers.</li>
          <li>Technical usage data such as model, latency, errors, message counts, and user identifier may be recorded to operate and improve the service. Prompts and completions are excluded from the current application telemetry.</li>
          <li>You remain responsible for checking AI output, respecting intellectual-property rights, and keeping independent copies of important work.</li>
        </ul>
        <label className="auth-checkbox"><input type="checkbox" required /> <span>I have read and understood this service notice.</span></label>
      </section>
      {message ? <p className="auth-success" role="status">{message}</p> : null}{error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Creating account…' : 'Create account'}</button>
      <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
    </form>}
  </AuthShell>
}
