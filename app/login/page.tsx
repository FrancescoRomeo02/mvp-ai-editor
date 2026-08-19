'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/auth/AuthProvider'
import { requireSupabase } from '../../src/lib/supabase'

export default function LoginPage() {
  const router = useRouter(); const { user, loading, configured } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  useEffect(() => { if (!loading && user) router.replace('/') }, [loading, router, user])
  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null)
    try { const { error: signInError } = await requireSupabase().auth.signInWithPassword({ email, password }); if (signInError) throw signInError; router.replace('/') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to sign in.') }
    finally { setSubmitting(false) }
  }
  return <AuthShell eyebrow="Paper editor" title="Return to your research." description="Open your projects and continue writing from where you left off.">
    {!configured ? <ConfigNotice /> : <form className="auth-form" onSubmit={submit}>
      <label htmlFor="login-email">Email<input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label htmlFor="login-password">Password<input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Sign in'}</button>
      <p className="auth-switch">New here? <Link href="/register">Create an account</Link></p>
    </form>}
  </AuthShell>
}

function ConfigNotice() { return <p className="auth-error" role="alert">Add the Supabase environment variables to enable authentication.</p> }

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-intro"><p className="project-setup-kicker">{eyebrow}</p><h1>{title}</h1><p>{description}</p><div className="auth-notes"><span>Document-first workspaces</span><span>Your projects, in one place</span><span>Private by default</span></div></section><section className="auth-panel"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true">P</span><span>Paper editor</span></div>{children}</section></main>
}
