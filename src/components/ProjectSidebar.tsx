'use client'

import { useProjectFiles, type ProjectWorkspace } from '../workspace/useProjectFiles'
import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import type { OutlineItem } from '../editor/outline'
import { displayProjectLabel, type ProjectFile } from '../workspace/projectFiles'
import { FileTree } from './FileTree'
import { Outline } from './Outline'
import { Icon } from './Icon'

type FileDialog = { mode: 'folder' | 'file' | 'rename'; node?: ProjectFile } | { mode: 'delete'; node: ProjectFile } | null

export function ProjectSidebar({ outline, onOutlineSelect, onFileSelect, workspace: suppliedWorkspace }: { outline: OutlineItem[]; onOutlineSelect: (item: OutlineItem) => void; onFileSelect?: (file: ProjectFile) => void; workspace?: ProjectWorkspace }) {
  const fallbackWorkspace = useProjectFiles(false)
  const workspace = suppliedWorkspace ?? fallbackWorkspace
  const { projectFiles, activeFileId, addFolder, addFile, renameNode, deleteNode, moveNode, uploadDocuments: uploadFiles } = workspace
  const [dialog, setDialog] = useState<FileDialog>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialog) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDialog(null) }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialog])

  const selectNode = (node: ProjectFile) => {
    workspace.selectNode(node)
    if (node.kind === 'file') onFileSelect?.(node)
  }

  const createNewFolder = () => {
    setDialog({ mode: 'folder' }); setDialogValue('')
  }

  const createNewFile = () => {
    setDialog({ mode: 'file' }); setDialogValue('Untitled document')
  }

  const renameItem = (node: ProjectFile) => {
    setDialog({ mode: 'rename', node }); setDialogValue(displayProjectLabel(node))
  }

  const deleteItem = (node: ProjectFile) => {
    if (node.id === 'paper') return
    setDialog({ mode: 'delete', node })
  }

  const submitDialog = () => {
    if (!dialog) return
    if (dialog.mode === 'delete') { deleteNode(dialog.node.id); setDialog(null); return }
    const label = dialogValue.trim()
    if (!label) return
    if (dialog.mode === 'folder') addFolder(label)
    if (dialog.mode === 'file') { const file = addFile(label); onFileSelect?.(file) }
    if (dialog.mode === 'rename' && dialog.node && label !== displayProjectLabel(dialog.node)) renameNode(dialog.node.id, label)
    setDialog(null)
  }

  const uploadDocuments = async (event: ChangeEvent<HTMLInputElement>) => {
    const uploads = Array.from(event.target.files ?? [])
    if (!uploads.length) return
    setUploadError(null)
    try { const newFiles = await uploadFiles(uploads); onFileSelect?.(newFiles[0]) }
    catch (error) { setUploadError(error instanceof Error ? error.message : 'Unable to upload the selected files.') }
    finally { event.target.value = '' }
  }

  return (
    <aside className="project-sidebar" aria-label="Project navigation">
      <div className="sidebar-brand"><span className="brand-mark" aria-hidden="true">P</span><span>Paper editor</span></div>
      <nav className="sidebar-nav" aria-label="Workspace"><span className="sidebar-nav-item is-current"><span className="nav-home-icon"><Icon name="home" size={15} /></span><span>Workspace</span></span></nav>
      <section className="sidebar-section" aria-labelledby="files-heading">
        <div className="sidebar-section-heading"><h2 id="files-heading">Project files</h2><div className="file-actions" aria-label="File actions">
          <button type="button" className="file-action-folder" aria-label="New folder" title="New folder" onClick={createNewFolder}><Icon name="folder-plus" size={16} /></button>
          <button type="button" className="file-action-document" aria-label="New file" title="New document" onClick={createNewFile}><Icon name="file-plus" size={16} /></button>
          <label className="upload-file-button" title="Upload files"><Icon name="upload" size={16} /><span className="sr-only">Upload files</span><input aria-label="Upload files" type="file" multiple accept=".md,.markdown,.tex,.bib,.txt,.csv,.json,.yaml,.yml,.pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={uploadDocuments} /></label>
        </div></div>
        {uploadError ? <p className="sidebar-error" role="alert">{uploadError}</p> : null}
        <FileTree nodes={projectFiles} activeId={activeFileId} onSelect={selectNode} onRename={renameItem} onDelete={deleteItem} onMove={(id, target) => moveNode(id, target.id)} />
      </section>
      <section className="sidebar-section outline-section" aria-labelledby="outline-heading">
        <h2 id="outline-heading">Outline</h2>
        <Outline items={outline} onSelect={onOutlineSelect} />
      </section>
      <div className="sidebar-footer"><Link className="account-link" href="/user"><Icon name="user" size={15} /> Account</Link></div>
      {dialog ? <div className="file-dialog-backdrop" role="presentation"><section className="file-dialog" role="dialog" aria-modal="true" aria-labelledby="file-dialog-title"><h2 id="file-dialog-title">{dialog.mode === 'delete' ? `Delete “${displayProjectLabel(dialog.node)}”?` : dialog.mode === 'rename' ? `Rename ${dialog.node?.kind === 'folder' ? 'folder' : 'document'}` : dialog.mode === 'folder' ? 'New folder' : 'New document'}</h2>{dialog.mode === 'delete' ? <p>{dialog.node.kind === 'folder' ? 'This also removes everything inside the folder.' : 'The document will be removed from this project.'}</p> : <label htmlFor="file-dialog-name">{dialog.mode === 'folder' ? 'Folder name' : 'Document name'}<input id="file-dialog-name" autoFocus value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitDialog() } }} /></label>}<div className="file-dialog-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button type="button" className={dialog.mode === 'delete' ? 'danger-button' : 'primary-button'} onClick={submitDialog}>{dialog.mode === 'delete' ? 'Delete' : dialog.mode === 'rename' ? 'Save changes' : 'Create'}</button></div></section></div> : null}
    </aside>
  )
}
