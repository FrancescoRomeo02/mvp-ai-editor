'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import React from 'react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Mathematics } from '@tiptap/extension-mathematics'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import Mention from '@tiptap/extension-mention'
import Table, { TableView } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { addColumnAfter, addRowAfter } from '@tiptap/pm/tables'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { latexStyles, tiptapToLatex, type LatexStyleId, type TiptapNode } from './latex'
import { displayProjectLabel } from './workspace/projectFiles'
import { getSupabaseAccessToken } from './lib/supabase'
import { markdownToTiptap, tiptapToMarkdown } from './markdownRoundTrip'
import { extractOutline, type OutlineItem } from './editor/outline'
import { slashItems, type SlashCommandId } from './editor/slashCommands'
import { ProjectSidebar } from './components/ProjectSidebar'
import { SlashMenu } from './components/SlashMenu'
import { EditorToolbar } from './components/EditorToolbar'
import { AIChat } from './components/AIChat'
import type { AIChatMessage, AIEditorContext, AIEditProposal } from './ai/types'
import { applyAIEditToDocument } from './ai/editorEdits'
import { Attachment, Callout, Column, Columns, TableOfContents } from './editor/customExtensions'
import { latexToTiptap } from './latexParser'
import { useProjectFiles } from './workspace/useProjectFiles'
import { useProjectSettings } from './workspace/useProjectSettings'

function isLatexFile(label: string) {
  return label.toLowerCase().endsWith('.tex')
}

function isMarkdownFile(label: string) {
  return /\.(md|markdown)$/i.test(label)
}

const EmptyParagraphHint = Extension.create({
  name: 'emptyParagraphHint',
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('emptyParagraphHint'),
      props: {
        decorations: (state) => {
          const { $from } = state.selection
          if ($from.parent.type.name !== 'paragraph' || $from.parent.content.size > 0) return DecorationSet.empty

          const position = $from.before($from.depth)
          return DecorationSet.create(state.doc, [
            Decoration.node(position, position + $from.parent.nodeSize, { class: 'is-current-empty' }),
          ])
        },
      },
    })]
  },
})

class ExpandableTableView extends TableView {
  private readonly editorView: EditorView

  constructor(node: ProseMirrorNode, cellMinWidth: number, view: EditorView) {
    super(node, cellMinWidth)
    this.editorView = view

    const controls = document.createElement('div')
    controls.className = 'table-controls'
    controls.append(
      this.createControl('+ Row', 'Add row', () => addRowAfter(view.state, view.dispatch)),
      this.createControl('+ Column', 'Add column', () => addColumnAfter(view.state, view.dispatch)),
    )
    this.dom.appendChild(controls)
  }

  private createControl(label: string, ariaLabel: string, action: () => boolean) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'table-control'
    button.textContent = label
    button.setAttribute('aria-label', ariaLabel)
    button.addEventListener('mousedown', (event) => event.preventDefault())
    button.addEventListener('click', () => {
      action()
      this.editorView.focus()
    })
    return button
  }
}

function getTableContext(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'table') {
      return { position: $from.before(depth), node: $from.node(depth) }
    }
  }
  return null
}

function insertParagraphAfterTable(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const table = getTableContext(editor)
  if (!table) return false

  const position = table.position + table.node.nodeSize
  if (editor.state.doc.nodeAt(position)?.type.name !== 'paragraph') {
    const selection = editor.state.selection
    editor.commands.insertContentAt(position, { type: 'paragraph' }, { updateSelection: false })
    editor.commands.setTextSelection({ from: selection.from, to: selection.to })
  }
  return true
}

function exitTable(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const table = getTableContext(editor)
  if (!table) return false

  const position = table.position + table.node.nodeSize
  insertParagraphAfterTable(editor)
  editor.commands.setTextSelection(position + 1)
  editor.commands.focus()
  return true
}

function getAIEditorContext(editor: NonNullable<ReturnType<typeof useEditor>>, fileName: string): AIEditorContext {
  const selection = editor.state.selection
  let activeBlockIndex = 0
  let activeBlock: ProseMirrorNode | null = null
  editor.state.doc.forEach((node, offset, index) => {
    if (activeBlock === null && selection.from >= offset && selection.from <= offset + node.nodeSize) {
      activeBlock = node
      activeBlockIndex = index
    }
  })
  const block = activeBlock ?? editor.state.doc.firstChild
  const blockJSON = block?.toJSON() as TiptapNode | undefined
  return {
    fileName,
    documentMarkdown: tiptapToMarkdown(editor.getJSON() as TiptapNode),
    activeBlockMarkdown: blockJSON ? tiptapToMarkdown({ type: 'doc', content: [blockJSON] }) : '',
    activeBlockIndex,
    activeBlockType: block?.type.name ?? 'paragraph',
    selectionText: editor.state.doc.textBetween(selection.from, selection.to, '\n'),
  }
}

export function BlockEditor({ projectId = 'default', projectName, onBack }: { projectId?: string; projectName?: string; onBack?: () => void }) {
  const workspace = useProjectFiles(true, projectId)
  const projectSettings = useProjectSettings(projectId)
  const selectedFile = workspace.activeNode ?? { id: 'main.md', label: 'main.md', kind: 'file' as const }
  const [slashQuery, setSlashQuery] = useState<string | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [selectedStyle, setSelectedStyle] = useState<LatexStyleId>('generic')
  const [latexPreview, setLatexPreview] = useState(() => tiptapToLatex({ type: 'doc', content: [{ type: 'paragraph' }] }))
  const [aiMessages, setAIMessages] = useState<AIChatMessage[]>([])
  const [aiInput, setAIInput] = useState('')
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [aiCreditsRemaining, setAICreditsRemaining] = useState<number | null>(null)
  const [aiEdit, setAIEdit] = useState<AIEditProposal | null>(null)
  const [aiEditorContext, setAIEditorContext] = useState<AIEditorContext | null>(null)
  const [aiUndoDocument, setAIUndoDocument] = useState<TiptapNode | null>(null)
  const [aiEditState, setAIEditState] = useState<'pending' | 'confirmed' | null>(null)
  const [showAIChat, setShowAIChat] = useState(false)
  const loadingFile = useRef(false)
  const loadedFileId = useRef<string | null>(null)
  const editor = useEditor({
    extensions: [
      Document, Paragraph, Text, Heading.configure({ levels: [1, 2, 3] }), BulletList, OrderedList, ListItem,
      TaskList, TaskItem.configure({ nested: true }), Blockquote, CodeBlock, HorizontalRule,
      Link.configure({ openOnClick: false }), Youtube, Mention.configure({ HTMLAttributes: { class: 'mention' } }),
      EmptyParagraphHint,
      Callout, Columns, Column, Attachment, TableOfContents,
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true, View: ExpandableTableView }), TableRow, TableHeader, TableCell,
      Mathematics,
    ],
    content: '<p></p>',
    autofocus: true,
    onUpdate: ({ editor: currentEditor }) => {
      const { $from } = currentEditor.state.selection
      const text = $from.parent.textContent
      const match = $from.parent.type.name === 'paragraph' ? text.match(/^\/([^\s]*)$/) : null
      setSlashQuery(match ? match[1].toLowerCase() : null)
      setOutline(extractOutline(currentEditor.getJSON() as TiptapNode))
      const currentDocument = currentEditor.getJSON() as TiptapNode
      const currentLatex = tiptapToLatex(currentDocument, selectedStyle)
      setLatexPreview(currentLatex)
      if (loadingFile.current) return
      if (isLatexFile(selectedFile.label)) workspace.updateFileContent(selectedFile.id, currentLatex, 'application/x-tex')
      if (isMarkdownFile(selectedFile.label)) workspace.updateFileContent(selectedFile.id, tiptapToMarkdown(currentDocument), 'text/markdown')
    },
    onCreate: ({ editor: currentEditor }) => {
      setOutline(extractOutline(currentEditor.getJSON() as TiptapNode))
      setLatexPreview(tiptapToLatex(currentEditor.getJSON() as TiptapNode))
    },
      editorProps: { attributes: { 'aria-label': 'Paper editor', role: 'textbox' } },
  })

  useEffect(() => {
    if (editor) setLatexPreview(tiptapToLatex(editor.getJSON() as TiptapNode, selectedStyle))
  }, [editor, selectedStyle])

  useEffect(() => {
    if (!editor || selectedFile.content === undefined || loadedFileId.current === selectedFile.id) return
    const isLatex = isLatexFile(selectedFile.label)
    const isMarkdown = isMarkdownFile(selectedFile.label)
    if (!isLatex && !isMarkdown) return
    loadedFileId.current = selectedFile.id
    const parsedDocument = isLatex ? latexToTiptap(selectedFile.content) : markdownToTiptap(selectedFile.content)
    loadingFile.current = true
    editor.commands.setContent(parsedDocument)
    setOutline(extractOutline(parsedDocument))
    setLatexPreview(tiptapToLatex(parsedDocument, selectedStyle))
    queueMicrotask(() => { loadingFile.current = false })
  }, [editor, selectedFile.content, selectedFile.label, workspace.activeFileId, workspace.hydrated])

  useEffect(() => {
    if (projectSettings.style) setSelectedStyle(projectSettings.style)
  }, [projectSettings.style])

  useEffect(() => {
    setSlashIndex(0)
  }, [slashQuery])

  const runSlashCommand = (id: SlashCommandId) => {
    if (!editor) return
    const { $from } = editor.state.selection
    const blockLength = $from.parent.textContent.length
    const deleteSlash = { from: $from.pos - blockLength, to: $from.pos }
    const chain = editor.chain().focus().deleteRange(deleteSlash)

    switch (id) {
      case 'title': chain.setHeading({ level: 1 }).run(); break
      case 'subtitle': chain.setHeading({ level: 2 }).run(); break
      case 'heading3': chain.setHeading({ level: 3 }).run(); break
      case 'paragraph': chain.setParagraph().run(); break
      case 'bullet': chain.toggleBulletList().run(); break
      case 'ordered': chain.toggleOrderedList().run(); break
      case 'todo': chain.toggleTaskList().run(); break
      case 'quote': chain.setBlockquote().run(); break
      case 'columns': chain.insertContent({ type: 'columns', content: [
        { type: 'column', content: [{ type: 'paragraph' }] },
        { type: 'column', content: [{ type: 'paragraph' }] },
      ] }).run(); break
      case 'callout': chain.insertContent({ type: 'callout', attrs: { tone: 'note' }, content: [{ type: 'paragraph' }] }).run(); break
      case 'divider': chain.setHorizontalRule().run(); break
      case 'table':
        chain.insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
        insertParagraphAfterTable(editor)
        break
      case 'code': chain.setCodeBlock().run(); break
      case 'toc': chain.insertContent({ type: 'tableOfContents' }).run(); break
      case 'mention': chain.insertContent({ type: 'mention', attrs: { id: 'author', label: 'Author' } }).run(); break
      case 'link': {
      const href = window.prompt('Link URL')
      if (href) chain.insertContent({ type: 'text', text: 'Source', marks: [{ type: 'link', attrs: { href } }] }).run()
        break
      }
      case 'formula': chain.insertContent('$E=mc^2$').run(); break
      case 'image': {
        const src = window.prompt('Image URL')
        if (src) chain.setImage({ src, alt: 'Academic figure' }).run()
        break
      }
      case 'video': {
        const src = window.prompt('Video URL')
        if (src) chain.setYoutubeVideo({ src, width: 640, height: 360 }).run()
        break
      }
      case 'attachment': {
        const href = window.prompt('Attachment URL')
        if (href) chain.insertContent({ type: 'attachment', attrs: { href, filename: href.split('/').pop() || 'Attachment' } }).run()
        break
      }
    }
    setSlashQuery(null)
  }

  const normalizeSlashQuery = (value: string) => value.toLowerCase().replace(/[\s-]/g, '')
  const visibleSlashItems = slashItems.filter((item) => normalizeSlashQuery(item.label).includes(normalizeSlashQuery(slashQuery ?? '')))
  const handleEditorKeyDown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('.ai-chat-panel')) return

    if (event.key === 'Escape' && editor && exitTable(editor)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const selection = editor?.state.selection
    const isEmptyParagraph = selection?.empty && selection.$from.parent.type.name === 'paragraph' && selection.$from.parent.content.size === 0 && selection.$from.parentOffset === 0
    if (event.key === ' ' && editor && isEmptyParagraph && !getTableContext(editor)) {
      event.preventDefault()
      event.stopPropagation()
      setAIError(null)
      setAIEdit(null)
      setShowAIChat(true)
      return
    }

    const atEndOfCell = selection?.empty && selection.$from.parent.type.name === 'paragraph' && selection.$from.parentOffset === selection.$from.parent.content.size
    if (event.key === 'Enter' && atEndOfCell && editor && getTableContext(editor) && !editor.can().goToNextCell()) {
      event.preventDefault()
      event.stopPropagation()
      exitTable(editor)
      return
    }

    if (!editor || slashQuery === null || visibleSlashItems.length === 0) return
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        setSlashQuery(null)
        break
      case 'ArrowDown':
        event.preventDefault()
        event.stopPropagation()
        setSlashIndex((index) => Math.min(index + 1, visibleSlashItems.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        event.stopPropagation()
        setSlashIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
        event.preventDefault()
        event.stopPropagation()
        runSlashCommand(visibleSlashItems[slashIndex].id)
        break
    }
  }

  const submitAIMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = aiInput.trim()
    if (!content || aiLoading) return

    const userMessage: AIChatMessage = { role: 'user', content }
    const messages = [userMessage]
    const context = editor ? getAIEditorContext(editor, selectedFile.label) : null
    if (!context) return
    setAIEditorContext(context)
    setAIMessages(messages)
    setAIInput('')
    setAIError(null)
    setAILoading(true)
    setAIUndoDocument(null)
    setAIEditState(null)

    try {
      const accessToken = await getSupabaseAccessToken()
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: (() => {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (accessToken) headers.Authorization = `Bearer ${accessToken}`
          return headers
        })(),
        body: JSON.stringify({ messages, context }),
      })
      const data = await response.json() as { content?: string; error?: string; creditsRemaining?: number; intent?: string; edit?: AIEditProposal }
      if (!response.ok || !data.content) throw new Error(data.error ?? 'AI request failed')
      setAICreditsRemaining(typeof data.creditsRemaining === 'number' ? data.creditsRemaining : null)
      const canEditFile = isMarkdownFile(selectedFile.label) || isLatexFile(selectedFile.label)
      if (data.edit && canEditFile && editor) {
        const currentDocument = editor.getJSON() as TiptapNode
        const nextDocument = applyAIEditToDocument(currentDocument, data.edit, context.activeBlockIndex)
        setAIUndoDocument(currentDocument)
        editor.commands.setContent(nextDocument)
        setAIEdit(null)
        setAIEditState('pending')
        setAIMessages([...messages, { role: 'assistant', content: 'Change applied to the active file.' }])
      } else if (data.edit && !canEditFile) {
        setAIEdit(data.edit)
        setAIMessages([...messages, { role: 'assistant', content: 'I can apply changes only to Markdown or LaTeX text files. Select a text file and try again.' }])
      } else {
        setAIEdit(null)
        setAIEditState(null)
        setAIMessages([...messages, { role: 'assistant', content: data.content }])
      }
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI request failed')
    } finally {
      setAILoading(false)
    }
  }

  const applyAIEdit = () => {
    if (!editor || !aiEdit || (!isMarkdownFile(selectedFile.label) && !isLatexFile(selectedFile.label))) return
    const currentDocument = editor.getJSON() as TiptapNode
    const nextDocument = applyAIEditToDocument(currentDocument, aiEdit, aiEditorContext?.activeBlockIndex ?? currentDocument.content?.length ?? 0)
    if (nextDocument === currentDocument) return
    setAIUndoDocument(currentDocument)
    editor.commands.setContent(nextDocument)
    setAIEdit(null)
    setAIEditState('pending')
  }

  const confirmAIEdit = () => {
    setAIUndoDocument(null)
    setAIEditState('confirmed')
  }

  const closeAIChat = () => {
    setShowAIChat(false)
    setAIMessages([])
    setAIInput('')
    setAIError(null)
    setAIEdit(null)
    setAIEditorContext(null)
    setAIUndoDocument(null)
    setAIEditState(null)
  }

  const undoAIEdit = () => {
    if (editor && aiUndoDocument) editor.commands.setContent(aiUndoDocument)
    setAIUndoDocument(null)
    setAIEdit(null)
    setAIEditState(null)
  }

  const downloadLatex = () => {
    const currentLatex = editor ? tiptapToLatex(editor.getJSON() as TiptapNode, selectedStyle) : latexPreview
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([currentLatex], { type: 'application/x-tex' }))
    link.download = isLatexFile(selectedFile.label) ? selectedFile.label : 'paper.tex'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const jumpToOutline = (item: OutlineItem) => {
    if (!editor) return
    let targetPosition: number | null = null
    editor.state.doc.descendants((node, position) => {
      if (targetPosition === null && node.type.name === 'heading' && node.textContent === item.label) targetPosition = position + 1
    })
    if (targetPosition !== null) editor.chain().focus().setTextSelection(targetPosition).run()
  }

  const chooseProjectStyle = () => {
    projectSettings.setStyle(selectedStyle)
  }

  return (
    <main className="page">
      <div className="workspace-shell">
        <ProjectSidebar outline={outline} onOutlineSelect={jumpToOutline} workspace={workspace} />
        <section className="workspace-main" aria-label="Paper editor workspace">
          <header className="document-topbar">
            <div className="document-location">{onBack && <button type="button" className="back-to-projects" onClick={onBack}>← Projects</button>}<span><span className="file-context">{projectName ?? 'Paper'} /</span><strong> {displayProjectLabel(selectedFile)}</strong></span></div>
            <EditorToolbar onDownload={downloadLatex} />
          </header>
          <article className="editor-document">
            <div className="editor-area" onKeyDownCapture={handleEditorKeyDown}>
              <EditorContent editor={editor} />
              {showAIChat && (
                <AIChat
                  messages={aiMessages}
                  input={aiInput}
                  loading={aiLoading}
                  error={aiError}
                  creditsRemaining={aiCreditsRemaining}
                  fileName={selectedFile.label}
                  edit={aiEdit}
                  editState={aiEditState}
                  canApplyEdit={isMarkdownFile(selectedFile.label) || isLatexFile(selectedFile.label)}
                  onInputChange={setAIInput}
                  onSubmit={submitAIMessage}
                  onClose={closeAIChat}
                  onApplyEdit={applyAIEdit}
                  onConfirmEdit={confirmAIEdit}
                  onUndoEdit={undoAIEdit}
                />
              )}
              {slashQuery !== null && visibleSlashItems.length > 0 && (
                <SlashMenu items={visibleSlashItems} activeIndex={slashIndex} onSelect={runSlashCommand} />
              )}
            </div>
          </article>
        </section>
      </div>
      {projectSettings.hydrated && !projectSettings.style && (
        <div className="project-setup-backdrop">
          <section className="project-setup" role="dialog" aria-modal="true" aria-labelledby="project-setup-title">
            <p className="project-setup-kicker">PROJECT SETUP</p>
            <h1 id="project-setup-title">Set your paper style</h1>
            <p>Choose the LaTeX style for this project. You can change it later from the same workspace.</p>
            <label htmlFor="project-style">LaTeX style</label>
            <select id="project-style" aria-label="Project LaTeX style" value={selectedStyle} onChange={(event) => setSelectedStyle(event.target.value as LatexStyleId)}>
              {Object.entries(latexStyles).map(([id, style]) => <option key={id} value={id}>{style.label}</option>)}
            </select>
            <button type="button" onClick={chooseProjectStyle}>Continue to workspace</button>
          </section>
        </div>
      )}
    </main>
  )
}
