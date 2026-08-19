'use client'

import { useEffect, useRef, useState } from 'react'
import { addProjectFile, createFile, createFolder, emptyProjectFiles, findProjectFile, initialProjectFiles, moveProjectFile, removeProjectFile, updateProjectFile, type ProjectFile } from './projectFiles'
import { buildProjectTree, deleteProjectObject, downloadProjectFile, ensureProjectStorage, listProjectNodes, uploadProjectFile } from './supabaseStorage'
import { requireSupabase } from '../lib/supabase'

const LEGACY_STORAGE_KEY = 'paper-editor:project-files'

function isTextDocument(file: File) { return file.type.startsWith('text/') || /\.(md|markdown|tex|bib|txt|csv|json|yaml|yml)$/i.test(file.name) }
function readTextFile(file: File) {
  if (typeof file.text === 'function') return file.text()
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result ?? '')); reader.onerror = () => reject(reader.error); reader.readAsText(file) })
}
function firstFile(nodes: ProjectFile[]): ProjectFile | undefined { for (const node of nodes) { if (node.kind === 'file') return node; const nested = firstFile(node.children ?? []); if (nested) return nested } return undefined }
function collectFileObjects(nodes: ProjectFile[], result: ProjectFile[] = []) { for (const node of nodes) node.kind === 'file' ? result.push(node) : collectFileObjects(node.children ?? [], result); return result }

export type ProjectWorkspace = {
  projectFiles: ProjectFile[]; activeFileId: string; activeNode?: ProjectFile; parentId: string; hydrated: boolean
  selectNode: (node: ProjectFile) => void; addFolder: (label: string) => void; addFile: (label: string) => ProjectFile
  renameNode: (id: string, label: string) => void; deleteNode: (id: string) => void; moveNode: (id: string, parentId: string) => void
  uploadDocuments: (uploads: File[]) => Promise<ProjectFile[]>; updateFileContent: (id: string, content: string, mime?: string) => void
}

function useLocalProjectFiles(persist: boolean, projectId: string): ProjectWorkspace {
  const storageKey = `${LEGACY_STORAGE_KEY}:${projectId}`
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(projectId === 'default' ? initialProjectFiles : emptyProjectFiles)
  const [activeFileId, setActiveFileId] = useState(projectId === 'default' ? 'main.md' : '')
  const [hydrated, setHydrated] = useState(!persist)
  useEffect(() => { if (!persist) return; try { const stored = localStorage.getItem(storageKey) ?? (projectId === 'default' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null); if (stored) setProjectFiles(JSON.parse(stored) as ProjectFile[]) } catch { /* ignore invalid legacy data */ } finally { setHydrated(true) } }, [persist, projectId, storageKey])
  useEffect(() => { if (persist && hydrated) localStorage.setItem(storageKey, JSON.stringify(projectFiles)) }, [hydrated, persist, projectFiles, storageKey])
  const activeNode = findProjectFile(projectFiles, activeFileId)
  const parentId = activeNode?.kind === 'folder' ? activeNode.id : projectFiles.find((node) => node.kind === 'folder')?.id ?? ''
  return {
    projectFiles, activeFileId, activeNode, parentId, hydrated, selectNode: (node) => setActiveFileId(node.id),
    addFolder: (label) => { const folder = createFolder(label); setProjectFiles((current) => addProjectFile(current, parentId, folder)); setActiveFileId(folder.id) },
    addFile: (label) => { const file = createFile(label); setProjectFiles((current) => addProjectFile(current, parentId, file)); setActiveFileId(file.id); return file },
    renameNode: (id, label) => setProjectFiles((current) => { const node = findProjectFile(current, id); if (!node) return current; if (node.kind === 'folder') return updateProjectFile(current, id, { label: label.trim() }); const extension = node.label.match(/\.[^./\\]+$/)?.[0] ?? '.md'; const cleanLabel = label.trim().replace(/\.[^./\\]+$/, '') || 'untitled'; return updateProjectFile(current, id, { label: `${cleanLabel}${extension}` }) }),
    deleteNode: (id) => { if (id === 'paper') return; setProjectFiles((current) => { const next = removeProjectFile(current, id); setActiveFileId((activeId) => findProjectFile(next, activeId) ? activeId : firstFile(next)?.id ?? ''); return next }) },
    moveNode: (id, targetParentId) => setProjectFiles((current) => moveProjectFile(current, id, targetParentId)),
    uploadDocuments: async (uploads) => { const newFiles = await Promise.all(uploads.map(async (upload) => createFile(upload.name, { mime: upload.type, size: upload.size, content: isTextDocument(upload) ? await readTextFile(upload) : undefined }))); setProjectFiles((current) => newFiles.reduce((tree, file) => addProjectFile(tree, parentId, file), current)); setActiveFileId(newFiles[0]?.id ?? activeFileId); return newFiles },
    updateFileContent: (id, content, mime = 'text/markdown') => setProjectFiles((current) => updateProjectFile(current, id, { content, mime })),
  }
}

function remoteNode(id: string, label: string, kind: 'file' | 'folder', parentId: string | null, mime?: string, size = 0, storagePath?: string, content?: string): ProjectFile {
  return { id, label, kind, parentId, mime, size, storagePath, content, ...(kind === 'folder' ? { children: [] } : {}) }
}

function useRemoteProjectFiles(projectId: string, enabled: boolean): ProjectWorkspace {
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(emptyProjectFiles)
  const [activeFileId, setActiveFileId] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const bucketId = projectId
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        await ensureProjectStorage(projectId)
        let rows = await listProjectNodes(projectId)
        if (!rows.length) {
          const id = crypto.randomUUID(); const path = `files/${id}/content`
          const { error } = await requireSupabase().from('project_files').insert({ id, project_id: projectId, kind: 'file', label: 'main.md', storage_path: path, mime_type: 'text/markdown', byte_size: 0 })
          if (error) throw error
          await uploadProjectFile(bucketId, path, '', 'text/markdown'); rows = await listProjectNodes(projectId)
        }
        if (cancelled) return
        const tree = buildProjectTree(rows); setProjectFiles(tree); setActiveFileId(firstFile(tree)?.id ?? '')
      } catch (error) { if (!cancelled) console.error('Project storage hydration failed', error) } finally { if (!cancelled) setHydrated(true) }
    })()
    return () => { cancelled = true }
  }, [bucketId, enabled, projectId])

  const activeNode = findProjectFile(projectFiles, activeFileId)
  useEffect(() => {
    if (!enabled) return
    if (!hydrated || !activeNode || activeNode.kind !== 'file' || !activeNode.storagePath) return
    let cancelled = false
    void downloadProjectFile(bucketId, activeNode.storagePath).then((content) => { if (!cancelled) setProjectFiles((current) => updateProjectFile(current, activeNode.id, { content })) }).catch((error) => console.error('Project file download failed', error))
    return () => { cancelled = true }
  }, [activeFileId, activeNode?.id, activeNode?.storagePath, bucketId, enabled, hydrated])

  const parentId = activeNode?.kind === 'folder' ? activeNode.id : projectFiles.find((node) => node.kind === 'folder')?.id ?? 'paper'
  const persistNode = (node: ProjectFile, content?: string) => {
    if (node.kind !== 'file' || !node.storagePath) return
    const previous = saveTimers.current.get(node.id); if (previous) clearTimeout(previous)
    saveTimers.current.set(node.id, setTimeout(() => { void (async () => { try { const value = content ?? node.content ?? ''; await uploadProjectFile(bucketId, node.storagePath!, value, node.mime ?? 'text/markdown'); await requireSupabase().from('project_files').update({ byte_size: new Blob([value]).size }).eq('id', node.id) } catch (error) { console.error('Project file save failed', error) } })() }, 500))
  }

  return {
    projectFiles, activeFileId, activeNode, parentId, hydrated,
    selectNode: (node) => setActiveFileId(node.id),
    addFolder: (label) => { const id = crypto.randomUUID(); const folder = remoteNode(id, label.trim(), 'folder', parentId); setProjectFiles((current) => addProjectFile(current, parentId, folder)); void requireSupabase().from('project_files').insert({ id, project_id: projectId, parent_id: parentId === 'paper' ? null : parentId, kind: 'folder', label: label.trim() }) },
    addFile: (label) => { const id = crypto.randomUUID(); const normalized = label.trim().match(/\.[^./\\]+$/) ? label.trim() : `${label.trim() || 'untitled'}.md`; const path = `files/${id}/content`; const file = remoteNode(id, normalized, 'file', parentId, 'text/markdown', 0, path, ''); setProjectFiles((current) => addProjectFile(current, parentId, file)); void requireSupabase().from('project_files').insert({ id, project_id: projectId, parent_id: parentId === 'paper' ? null : parentId, kind: 'file', label: normalized, storage_path: path, mime_type: 'text/markdown', byte_size: 0 }).then(({ error }) => { if (!error) void uploadProjectFile(bucketId, path, '', 'text/markdown') }); setActiveFileId(id); return file },
    renameNode: (id, label) => { const node = findProjectFile(projectFiles, id); if (!node) return; const nextLabel = node.kind === 'folder' ? label.trim() : `${label.trim().replace(/\.[^./\\]+$/, '') || 'untitled'}${node.label.match(/\.[^./\\]+$/)?.[0] ?? '.md'}`; setProjectFiles((current) => updateProjectFile(current, id, { label: nextLabel })); void requireSupabase().from('project_files').update({ label: nextLabel }).eq('id', id) },
    deleteNode: (id) => { if (id === 'paper') return; const node = findProjectFile(projectFiles, id); if (!node) return; const files = collectFileObjects(node.kind === 'folder' ? node.children ?? [] : [node]); const next = removeProjectFile(projectFiles, id); setProjectFiles(next); setActiveFileId((current) => current === id ? firstFile(next)?.id ?? '' : current); void (async () => { for (const file of files) if (file.storagePath) await deleteProjectObject(bucketId, file.storagePath).catch(() => undefined); await requireSupabase().from('project_files').delete().eq('id', id) })() },
    moveNode: (id, targetParentId) => { setProjectFiles((current) => moveProjectFile(current, id, targetParentId)); void requireSupabase().from('project_files').update({ parent_id: targetParentId === 'paper' ? null : targetParentId }).eq('id', id) },
    uploadDocuments: async (uploads) => { const result: ProjectFile[] = []; for (const upload of uploads) { const id = crypto.randomUUID(); const path = `files/${id}/content`; const mime = upload.type || 'application/octet-stream'; const content = isTextDocument(upload) ? await readTextFile(upload) : undefined; await uploadProjectFile(bucketId, path, content ?? upload, mime); const { error } = await requireSupabase().from('project_files').insert({ id, project_id: projectId, parent_id: parentId === 'paper' ? null : parentId, kind: 'file', label: upload.name, storage_path: path, mime_type: mime, byte_size: upload.size }); if (error) { await deleteProjectObject(bucketId, path).catch(() => undefined); throw error } result.push(remoteNode(id, upload.name, 'file', parentId, mime, upload.size, path, content)) } setProjectFiles((current) => result.reduce((tree, file) => addProjectFile(tree, parentId, file), current)); setActiveFileId(result[0]?.id ?? activeFileId); return result },
    updateFileContent: (id, content, mime = 'text/markdown') => { setProjectFiles((current) => { const next = updateProjectFile(current, id, { content, mime }); const node = findProjectFile(next, id); if (node) persistNode(node, content); return next }) },
  }
}

export function useProjectFiles(persist = true, projectId = 'default'): ProjectWorkspace {
  const local = useLocalProjectFiles(persist && projectId === 'default', projectId)
  const remote = useRemoteProjectFiles(projectId, projectId !== 'default')
  return projectId === 'default' ? local : remote
}
