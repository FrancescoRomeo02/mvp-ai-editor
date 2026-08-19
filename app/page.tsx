'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlockEditor } from '../src/BlockEditor'
import { ProjectsPage } from '../src/ProjectsPage'
import { useAuth } from '../src/auth/AuthProvider'

export default function Page() {
  const router = useRouter(); const { user, loading } = useAuth()
  const [project, setProject] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => { if (!loading && !user) router.replace('/login') }, [loading, router, user])
  if (loading || !user) return <main className="projects-page" aria-busy="true"><p className="loading-message">Loading your workspace…</p></main>
  return project ? <BlockEditor projectId={project.id} projectName={project.name} onBack={() => setProject(null)} /> : <ProjectsPage onOpen={(id, name) => setProject({ id, name })} />
}
