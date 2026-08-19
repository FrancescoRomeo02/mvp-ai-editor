import { describe, expect, it } from 'vitest'
import { applyAIEditToDocument } from './editorEdits'

describe('applyAIEditToDocument', () => {
  const document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Draft' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Keep' }] }] }

  it('replaces the active block with the model-selected Markdown block', () => {
    const result = applyAIEditToDocument(document, { operation: 'replace_current', blockType: 'heading1', markdown: '# Results' }, 0)
    expect(result.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
    expect(result.content?.[1]).toMatchObject({ type: 'paragraph' })
  })

  it('inserts a new block after the active block without replacing the document', () => {
    const result = applyAIEditToDocument(document, { operation: 'insert_after_current', blockType: 'bulletList', markdown: '- One\n- Two' }, 0)
    expect(result.content).toHaveLength(3)
    expect(result.content?.[1]).toMatchObject({ type: 'bulletList' })
  })
})
