export type Project = { id: string; name: string; createdAt: string }

export function createProject(name: string): Project {
  return { id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim(), createdAt: new Date().toISOString() }
}
