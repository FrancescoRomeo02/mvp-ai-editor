import { requireSupabase } from '../lib/supabase'
import type { ProjectFile } from './projectFiles'

export type StoredProjectNode = {
  id: string
  project_id: string
  parent_id: string | null
  kind: 'file' | 'folder'
  label: string
  storage_path: string | null
  mime_type: string | null
  byte_size: number
  updated_at: string
}

async function accessToken() {
  const { data, error } = await requireSupabase().auth.getSession()
  if (error || !data.session?.access_token) throw new Error('Your session has expired. Please sign in again.')
  return data.session.access_token
}

export async function ensureProjectStorage(projectId: string) {
  const token = await accessToken()
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/storage`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json() as { bucketId?: string; error?: string }
  if (!response.ok || !data.bucketId) throw new Error(data.error ?? 'Unable to prepare project storage.')
  return data.bucketId
}

export async function listProjectNodes(projectId: string) {
  const { data, error } = await requireSupabase().from('project_files')
    .select('id, project_id, parent_id, kind, label, storage_path, mime_type, byte_size, updated_at')
    .eq('project_id', projectId).order('label', { ascending: true })
  if (error) throw error
  return (data ?? []) as StoredProjectNode[]
}

export function buildProjectTree(rows: StoredProjectNode[]) {
  const nodes = new Map<string, ProjectFileNode>()
  for (const row of rows) nodes.set(row.id, {
    id: row.id, label: row.label, kind: row.kind, children: row.kind === 'folder' ? [] : undefined,
    mime: row.mime_type ?? undefined, size: row.byte_size, parentId: row.parent_id,
    storagePath: row.storage_path ?? undefined, updatedAt: row.updated_at,
  })
  const roots: ProjectFileNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent?.kind === 'folder') parent.children?.push(node)
    else roots.push(node)
  }
  return [{ id: 'paper', label: 'Paper', kind: 'folder' as const, children: roots }]
}

type ProjectFileNode = ProjectFile & { children?: ProjectFileNode[] }

export async function downloadProjectFile(bucketId: string, path: string) {
  const { data, error } = await requireSupabase().storage.from(bucketId).download(path)
  if (error) throw error
  return data.text()
}

export async function uploadProjectFile(bucketId: string, path: string, content: Blob | string, contentType: string) {
  const { error } = await requireSupabase().storage.from(bucketId).upload(path, content, { contentType, upsert: true })
  if (error) throw error
}

export async function deleteProjectObject(bucketId: string, path: string) {
  const { error } = await requireSupabase().storage.from(bucketId).remove([path])
  if (error) throw error
}
