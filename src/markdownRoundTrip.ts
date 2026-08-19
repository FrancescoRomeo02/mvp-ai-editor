import type { TiptapNode } from './latex'

function inlineToMarkdown(node: TiptapNode): string {
  if (node.type === 'text') {
    let value = node.text ?? ''
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') value = `**${value}**`
      if (mark.type === 'italic') value = `*${value}*`
      if (mark.type === 'link') value = `[${value}](${String(mark.attrs?.href ?? '')})`
    }
    return value
  }
  if (node.type === 'mention') return `[@${String(node.attrs?.id ?? node.attrs?.label ?? '')}]`
  if (node.type === 'hardBreak') return '\n'
  return (node.content ?? []).map(inlineToMarkdown).join('')
}

function blockToMarkdown(node: TiptapNode): string {
  if (node.type === 'heading') return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${inlineToMarkdown(node)}`
  if (node.type === 'paragraph') return inlineToMarkdown(node)
  if (node.type === 'bulletList') return (node.content ?? []).map((item) => `- ${inlineToMarkdown(item)}`).join('\n')
  if (node.type === 'orderedList') return (node.content ?? []).map((item, index) => `${index + 1}. ${inlineToMarkdown(item)}`).join('\n')
  if (node.type === 'blockquote') return (node.content ?? []).map((child) => `> ${blockToMarkdown(child)}`).join('\n')
  if (node.type === 'codeBlock') return `\`\`\`\n${(node.content ?? []).map((child) => child.text ?? '').join('')}\n\`\`\``
  if (node.type === 'horizontalRule') return '---'
  if (node.type === 'image') return `![${String(node.attrs?.alt ?? 'Figure')}](${String(node.attrs?.src ?? '')})`
  if (node.type === 'tableOfContents') return '[[toc]]'
  if (node.type === 'table') {
    const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => inlineToMarkdown(cell)))
    const width = Math.max(1, ...rows.map((row) => row.length))
    const padded = rows.map((row) => [...row, ...Array(width - row.length).fill('')])
    const header = `| ${padded[0].join(' | ')} |`
    const separator = `| ${padded[0].map(() => '---').join(' | ')} |`
    const body = padded.slice(1).map((row) => `| ${row.join(' | ')} |`)
    return [header, separator, ...body].join('\n')
  }
  return (node.content ?? []).map(blockToMarkdown).join('\n\n')
}

export function tiptapToMarkdown(document: TiptapNode) {
  return (document.content ?? []).map(blockToMarkdown).filter(Boolean).join('\n\n')
}

function tableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function inlineFromMarkdown(value: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  let remaining = value
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|\[@([^\]]+)\])/ 
  while (remaining) {
    const match = remaining.match(pattern)
    if (!match || match.index === undefined) {
      nodes.push({ type: 'text', text: remaining })
      break
    }
    if (match.index > 0) nodes.push({ type: 'text', text: remaining.slice(0, match.index) })
    if (match[2]) nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    else if (match[3]) nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    else if (match[4]) nodes.push({ type: 'text', text: match[4], marks: [{ type: 'link', attrs: { href: match[5] } }] })
    else if (match[6]) nodes.push({ type: 'mention', attrs: { id: match[6].replace(/^@/, ''), label: match[6].replace(/^@/, '') } })
    remaining = remaining.slice(match.index + match[0].length)
  }
  return nodes
}

function paragraphWithInline(text: string): TiptapNode {
  return text ? { type: 'paragraph', content: inlineFromMarkdown(text) } : { type: 'paragraph' }
}

export function markdownToTiptap(markdown: string): TiptapNode {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const content: TiptapNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) { index += 1; continue }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      content.push({ type: 'heading', attrs: { level: heading[1].length }, content: inlineFromMarkdown(heading[2]) })
      index += 1
      continue
    }

    if (line === '---') { content.push({ type: 'horizontalRule' }); index += 1; continue }
    if (line === '[[toc]]') { content.push({ type: 'tableOfContents' }); index += 1; continue }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (image) {
      content.push({ type: 'image', attrs: { alt: image[1], src: image[2] } })
      index += 1
      continue
    }

    if (line === '```') {
      const code: string[] = []
      index += 1
      while (index < lines.length && lines[index].trim() !== '```') code.push(lines[index++])
      content.push({ type: 'codeBlock', content: code.length ? [{ type: 'text', text: code.join('\n') }] : [] })
      index += 1
      continue
    }

    if (line.startsWith('|') && index + 1 < lines.length && /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[index + 1].trim())) {
      const rows: TiptapNode[] = []
      const header = tableRow(line)
      rows.push({ type: 'tableRow', content: header.map((cell) => ({ type: 'tableHeader', content: cell ? [{ type: 'text', text: cell }] : [] })) })
      index += 2
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const cells = tableRow(lines[index])
        rows.push({ type: 'tableRow', content: cells.map((cell) => ({ type: 'tableCell', content: cell ? [{ type: 'text', text: cell }] : [] })) })
        index += 1
      }
      content.push({ type: 'table', content: rows })
      continue
    }

    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      const items: TiptapNode[] = []
      while (index < lines.length) {
        const match = lines[index].trim().match(/^[-*]\s+(.+)$/)
        if (!match) break
        items.push({ type: 'listItem', content: [paragraphWithInline(match[1])] })
        index += 1
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      const items: TiptapNode[] = []
      while (index < lines.length) {
        const match = lines[index].trim().match(/^\d+\.\s+(.+)$/)
        if (!match) break
        items.push({ type: 'listItem', content: [paragraphWithInline(match[1])] })
        index += 1
      }
      content.push({ type: 'orderedList', content: items })
      continue
    }

    const blockquote = line.match(/^>\s?(.*)$/)
    if (blockquote) {
      const quote: TiptapNode[] = []
      while (index < lines.length) {
        const match = lines[index].trim().match(/^>\s?(.*)$/)
        if (!match) break
        quote.push(paragraphWithInline(match[1]))
        index += 1
      }
      content.push({ type: 'blockquote', content: quote })
      continue
    }

    const text: string[] = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s|^\||^```$|^[-*]\s|^\d+\.\s|^>\s?|^---$|^\[\[toc\]\]$/.test(lines[index].trim())) text.push(lines[index++].trim())
    content.push(paragraphWithInline(text.join(' ')))
  }

  return { type: 'doc', content }
}
