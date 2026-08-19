export type ProjectFile = {
  id: string
  label: string
  kind: 'folder' | 'file'
  children?: ProjectFile[]
  content?: string
  mime?: string
  size?: number
  parentId?: string | null
  storagePath?: string
  updatedAt?: string
}

export const initialProjectFiles: ProjectFile[] = [
  { id: 'paper', label: 'Paper', kind: 'folder', children: [
    { id: 'resources', label: 'resources', kind: 'folder', children: [
      { id: 'figures', label: 'figures', kind: 'folder' },
      { id: 'references', label: 'references.bib', kind: 'file', mime: 'text/x-bibtex' },
    ] },
    { id: 'main.md', label: 'main.md', kind: 'file', mime: 'text/markdown', content: '' },
  ] },
]

export const emptyProjectFiles: ProjectFile[] = []

export function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function findProjectFile(nodes: ProjectFile[], id: string): ProjectFile | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = node.children && findProjectFile(node.children, id)
    if (found) return found
  }
  return undefined
}

export function addProjectFile(nodes: ProjectFile[], parentId: string, child: ProjectFile): ProjectFile[] {
  if (!parentId) return [...nodes, child]
  return nodes.map((node) => {
    if (node.id === parentId && node.kind === 'folder') return { ...node, children: [...(node.children ?? []), child] }
    if (!node.children) return node
    return { ...node, children: addProjectFile(node.children, parentId, child) }
  })
}

export function removeProjectFile(nodes: ProjectFile[], id: string): ProjectFile[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => node.children ? { ...node, children: removeProjectFile(node.children, id) } : node)
}

function containsNode(nodes: ProjectFile[] | undefined, id: string): boolean {
  return Boolean(nodes?.some((node) => node.id === id || containsNode(node.children, id)))
}

export function moveProjectFile(nodes: ProjectFile[], id: string, parentId: string): ProjectFile[] {
  const moving = findProjectFile(nodes, id)
  if (!moving || moving.id === parentId || containsNode(moving.children, parentId)) return nodes
  const withoutMoving = removeProjectFile(nodes, id)
  return addProjectFile(withoutMoving, parentId, moving)
}

export function updateProjectFile(nodes: ProjectFile[], id: string, patch: Partial<ProjectFile>): ProjectFile[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...patch }
    if (!node.children) return node
    return { ...node, children: updateProjectFile(node.children, id, patch) }
  })
}

export function createFolder(label: string): ProjectFile {
  return { id: createId('folder'), label: label.trim(), kind: 'folder', children: [] }
}

export function createFile(label: string, metadata: Pick<ProjectFile, 'content' | 'mime' | 'size'> = {}): ProjectFile {
  const normalizedLabel = label.trim()
  const hasExtension = /\.[^./\\]+$/.test(normalizedLabel)
  return { id: createId('file'), label: hasExtension ? normalizedLabel : `${normalizedLabel || 'untitled'}.md`, kind: 'file', mime: metadata.mime ?? 'text/markdown', ...metadata }
}

export function displayProjectLabel(node: Pick<ProjectFile, 'label' | 'kind'>): string {
  if (node.kind === 'folder') return node.label
  return node.label.replace(/\.[^./\\]+$/, '') || node.label
}
