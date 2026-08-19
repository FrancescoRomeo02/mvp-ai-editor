import { describe, expect, it } from 'vitest'
import { createProject } from './projects'

describe('project model', () => {
  it('creates a named project with a stable id and creation date', () => {
    const project = createProject('  Biodiversity study  ')
    expect(project.name).toBe('Biodiversity study')
    expect(project.id).toMatch(/^project-/)
    expect(Number.isNaN(Date.parse(project.createdAt))).toBe(false)
  })
})
