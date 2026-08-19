import { describe, expect, it } from 'vitest'
import { addProjectFile, createFile, createFolder, findProjectFile, initialProjectFiles, moveProjectFile, removeProjectFile } from './projectFiles'

describe('project file model', () => {
  it('finds and adds nodes without mutating the existing tree', () => {
    const folder = createFolder('data')
    const tree = addProjectFile(initialProjectFiles, 'paper', folder)
    const withFile = addProjectFile(tree, folder.id, createFile('results.md'))

    expect(findProjectFile(initialProjectFiles, folder.id)).toBeUndefined()
    expect(findProjectFile(withFile, folder.id)?.children?.[0].label).toBe('results.md')
  })

  it('keeps uploaded file metadata and content', () => {
    const file = createFile('notes.md', { content: '# Notes', mime: 'text/markdown', size: 7 })
    expect(file).toMatchObject({ label: 'notes.md', kind: 'file', content: '# Notes', mime: 'text/markdown', size: 7 })
  })

  it('adds a file or folder at the root of an empty project', () => {
    const folder = createFolder('manuscript')
    const tree = addProjectFile([], '', folder)
    expect(tree).toHaveLength(1)
    expect(tree[0].label).toBe('manuscript')
  })

  it('moves and removes nested workspace nodes without mutating the source tree', () => {
    const source = [{ id: 'root', label: 'Root', kind: 'folder' as const, children: [
      { id: 'one', label: 'One', kind: 'folder' as const, children: [{ id: 'draft.md', label: 'draft.md', kind: 'file' as const }] },
      { id: 'two', label: 'Two', kind: 'folder' as const, children: [] },
    ] }]
    const moved = moveProjectFile(source, 'draft.md', 'two')

    expect(findProjectFile(moved, 'draft.md')).toBeDefined()
    expect(findProjectFile(moved, 'two')?.children?.[0].id).toBe('draft.md')
    expect(findProjectFile(moved, 'one')?.children).toHaveLength(0)
    expect(findProjectFile(source, 'one')?.children).toHaveLength(1)
    expect(findProjectFile(removeProjectFile(moved, 'two'), 'two')).toBeUndefined()
  })
})
