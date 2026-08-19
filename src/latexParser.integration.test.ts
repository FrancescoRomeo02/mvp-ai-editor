import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { latexToTiptap } from './latexParser'
import { tiptapToLatex } from './latex'
import { markdownToTiptap, tiptapToMarkdown } from './markdownRoundTrip'

describe('latexToTiptap integration fixtures', () => {
  it('parses and serializes Markdown semantics without flattening inline marks', () => {
    const document = markdownToTiptap('# Results\n\nA **bold** and *italic* [source](https://example.com) [@fig:chart].')

    expect(document.content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
    expect(document.content?.[1]?.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }),
      expect.objectContaining({ type: 'text', text: 'italic', marks: [{ type: 'italic' }] }),
      expect.objectContaining({ type: 'text', text: 'source', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }),
      expect.objectContaining({ type: 'mention', attrs: expect.objectContaining({ id: 'fig:chart' }) }),
    ]))
    expect(tiptapToMarkdown(document)).toContain('**bold**')
    expect(tiptapToMarkdown(document)).toContain('[@fig:chart]')
  })

  it('keeps the supplied linguistic paper fixture non-empty and structured', () => {
    const document = latexToTiptap(readFileSync('src/fixtures/main.tex', 'utf8'))

    expect(document.type).toBe('doc')
    expect(document.content?.length).toBeGreaterThan(0)
    expect(document.content?.filter((node) => node.type === 'heading')).toHaveLength(3)
    expect(document.content?.filter((node) => node.type === 'table')).toHaveLength(2)
    expect(JSON.stringify(document)).toContain('Topicalization from sentential subject:')
    expect(JSON.stringify(document)).toContain("Structure of A$'$ Projections:")
    expect(JSON.stringify(document)).not.toContain('\\enumsentence')
    expect(JSON.stringify(document)).not.toContain('\\nodeconnect')
    expect(JSON.stringify(document)).not.toContain('"text":""')

    const markdown = tiptapToMarkdown(document)
    expect(markdown).toContain('# Notes for My Paper')
    expect(markdown).toContain('Topicalization from sentential subject:')

    const reparsed = markdownToTiptap(markdown)
    expect(reparsed.content?.filter((node) => node.type === 'heading')).toHaveLength(3)
    expect(reparsed.content?.filter((node) => node.type === 'table')).toHaveLength(2)

    const derivedLatex = tiptapToLatex(reparsed)
    expect(derivedLatex).toContain('\\section{Notes for My Paper}')
    expect(derivedLatex).toContain('Topicalization from sentential subject:')
  })
})
