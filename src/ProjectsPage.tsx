'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from './auth/AuthProvider'
import { useSupabaseProjects } from './workspace/useSupabaseProjects'

export function ProjectsPage({ onOpen }: { onOpen: (id: string, name: string) => void }) {
  const { user, signOut } = useAuth()
  const { projects, loading, error, createProject } = useSupabaseProjects()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  if (loading) return <main className="projects-page" aria-busy="true"><p className="loading-message">Loading your projects…</p></main>

  const create = async () => {
    const value = name.trim()
    if (!value) return
    setCreating(true); setCreateError(null)
    try { const project = await createProject(value); setName(''); onOpen(project.id, project.title) }
    catch (caught) { setCreateError(caught instanceof Error ? caught.message : 'Unable to create the project.') }
    finally { setCreating(false) }
  }

  const open = (id: string, projectName: string) => onOpen(id, projectName)

  return (
    <main className="projects-page">
      <section className="projects-panel" aria-labelledby="projects-title">
        <header className="projects-header"><div><p className="project-setup-kicker">PAPER EDITOR</p><h1 id="projects-title">Your projects</h1></div><nav className="projects-actions" aria-label="Workspace navigation"><Link className="text-button" href="/user">Account</Link><button className="text-button" type="button" onClick={() => void signOut()}>Sign out</button></nav></header>
        <p className="projects-intro">Create a focused workspace for your paper, with its files, sections, and research material in one place.</p>
        <form className="project-create-form" onSubmit={(event) => { event.preventDefault(); create() }}>
          <label htmlFor="new-project-name">Project name</label>
          <div><input id="new-project-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Biodiversity study" /><button disabled={creating} type="submit">{creating ? 'Creating…' : 'Create project'}</button></div>
        </form>
        {error || createError ? <p className="auth-error" role="alert">{error ?? createError}</p> : null}
        <div className="projects-list" aria-label="Saved projects">
          {projects.length === 0 ? <p className="projects-empty">No projects yet. Your next paper starts here.</p> : projects.map((project) => (
            <button className="project-card" type="button" key={project.id} onClick={() => open(project.id, project.title)}>
              <span className="project-card-icon" aria-hidden="true">P</span><span><strong>{project.title}</strong><small>Updated {new Date(project.updated_at).toLocaleDateString()}</small></span><span className="project-card-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <p className="projects-account">Signed in as <strong>{user?.email}</strong></p>
      </section>
    </main>
  )
}
