'use client'

import { useEffect, useState } from 'react'
import { createProject, type Project } from './projects'

const PROJECTS_KEY = 'paper-editor:projects'
const ACTIVE_PROJECT_KEY = 'paper-editor:active-project'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_KEY)
      const storedActive = localStorage.getItem(ACTIVE_PROJECT_KEY)
      if (storedProjects) setProjects(JSON.parse(storedProjects) as Project[])
      if (storedActive) setActiveProjectId(storedActive)
    } catch {
      // Corrupt local project data is ignored.
    } finally {
      setHydrated(true)
    }
  }, [])

  const openProject = (id: string) => {
    setActiveProjectId(id)
    localStorage.setItem(ACTIVE_PROJECT_KEY, id)
  }

  const addProject = (name: string) => {
    const project = createProject(name)
    setProjects((current) => [...current, project])
    openProject(project.id)
    return project
  }

  return { projects, activeProjectId, hydrated, openProject, addProject }
}
