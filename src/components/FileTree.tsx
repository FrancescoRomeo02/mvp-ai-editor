'use client'

import { useState } from 'react'
import { displayProjectLabel, type ProjectFile } from '../workspace/projectFiles'
import { Icon } from './Icon'
export type { ProjectFile } from '../workspace/projectFiles'

type FileTreeProps = {
  nodes: ProjectFile[]
  activeId: string
  onSelect: (node: ProjectFile) => void
  onRename: (node: ProjectFile) => void
  onDelete: (node: ProjectFile) => void
  onMove: (id: string, target: ProjectFile) => void
}
type TreeNodeProps = Omit<FileTreeProps, 'nodes'> & { node: ProjectFile }

export function FileTree({ nodes, activeId, onSelect, onRename, onDelete, onMove }: FileTreeProps) {
  return <ul className="file-tree">{nodes.map((node) => <TreeNode key={node.id} node={node} activeId={activeId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} onMove={onMove} />)}</ul>
}

function TreeNode({ node, activeId, onSelect, onRename, onDelete, onMove }: TreeNodeProps) {
  const [open, setOpen] = useState(true)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const hasChildren = node.kind === 'folder' && Boolean(node.children?.length)
  const displayLabel = displayProjectLabel(node)

  return (
    <li
      onDragOver={(event) => {
        if (node.kind !== 'folder') return
        event.preventDefault()
        setIsDropTarget(true)
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDropTarget(false)
        const draggedId = event.dataTransfer.getData('text/project-file')
        if (draggedId && draggedId !== node.id) onMove(draggedId, node)
      }}
    >
      <div className={`file-tree-row ${activeId === node.id ? 'is-active' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}>
        <button
          type="button"
          className={`file-tree-main ${activeId === node.id ? 'is-active' : ''}`}
          draggable
          aria-expanded={hasChildren ? open : undefined}
          aria-label={`${displayLabel}${node.kind === 'folder' ? ' folder' : ' file'}`}
          onDragStart={(event) => {
            event.dataTransfer.setData('text/project-file', node.id)
            event.dataTransfer.effectAllowed = 'move'
          }}
          onClick={() => { onSelect(node); if (hasChildren) setOpen((value) => !value) }}
        >
          <span className="tree-chevron" aria-hidden="true">{hasChildren ? <Icon name={open ? 'chevron-down' : 'chevron-right'} size={13} /> : null}</span>
          <span className={`tree-icon tree-icon-${node.kind}`}><Icon name={node.kind === 'folder' ? 'folder' : 'file'} size={15} /></span>
          <span className="tree-label">{displayLabel}</span>
        </button>
        {node.id !== 'paper' && <span className="file-tree-actions">
          <button type="button" className="tree-action" aria-label={`Rename ${displayLabel}`} title="Rename" onClick={() => onRename(node)}><Icon name="edit" size={14} /></button>
          <button type="button" className="tree-action tree-action-danger" aria-label={`Delete ${displayLabel}`} title="Delete" onClick={() => onDelete(node)}><Icon name="trash" size={14} /></button>
        </span>}
      </div>
      {hasChildren && open && <FileTree nodes={node.children ?? []} activeId={activeId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} onMove={onMove} />}
    </li>
  )
}
