import type { TiptapNode } from '../latex'
import { markdownToTiptap } from '../markdownRoundTrip'
import type { AIEditProposal } from './types'

export function applyAIEditToDocument(document: TiptapNode, edit: AIEditProposal, activeBlockIndex: number) {
  const proposedNodes = markdownToTiptap(edit.markdown).content ?? []
  if (proposedNodes.length === 0 || edit.operation === 'none') return document

  const content = [...(document.content ?? [])]
  const targetIndex = edit.targetIndex ?? activeBlockIndex
  if (edit.operation === 'replace_current' && content.length > 0) content.splice(Math.max(0, Math.min(targetIndex, content.length - 1)), 1, ...proposedNodes)
  if (edit.operation === 'insert_after_current') content.splice(Math.max(0, Math.min(targetIndex + 1, content.length)), 0, ...proposedNodes)
  if (edit.operation === 'append') content.push(...proposedNodes)
  return { ...document, content }
}
