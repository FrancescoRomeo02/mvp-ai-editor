import type { TiptapNode } from './latex'

function textNode(text: string): TiptapNode {
  return { type: 'text', text }
}

function readGroup(source: string, openIndex: number) {
  if (source[openIndex] !== '{') return null
  let depth = 1
  for (let index = openIndex + 1; index < source.length; index += 1) {
    if (source[index] === '\\') { index += 1; continue }
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return { value: source.slice(openIndex + 1, index), end: index + 1 }
    }
  }
  return null
}

function replaceGroupedMacro(source: string, name: string, arity: number, replace: (groups: string[]) => string) {
  let result = source
  let searchFrom = 0
  while (searchFrom < result.length) {
    const macroIndex = result.indexOf(`\\${name}`, searchFrom)
    if (macroIndex === -1) break
    let cursor = macroIndex + name.length + 1
    const groups: string[] = []
    let valid = true
    for (let groupIndex = 0; groupIndex < arity; groupIndex += 1) {
      while (/\s/.test(result[cursor] ?? '')) cursor += 1
      const group = readGroup(result, cursor)
      if (!group) { valid = false; break }
      groups.push(group.value)
      cursor = group.end
    }
    if (!valid) { searchFrom = macroIndex + name.length + 1; continue }
    const replacement = replace(groups)
    result = `${result.slice(0, macroIndex)}${replacement}${result.slice(cursor)}`
    searchFrom = macroIndex + replacement.length
  }
  return result
}

function expandSpecialMacros(source: string) {
  let expanded = replaceGroupedMacro(source, 'shortex', 4, (groups) => `\n\\begin{shortex}\n${groups.slice(1).join('\n')}\n\\end{shortex}\n`)
  expanded = replaceGroupedMacro(expanded, 'enumsentence', 1, ([body]) => `\n${body}\n`)
  expanded = replaceGroupedMacro(expanded, 'nodeconnect', 2, () => '')
  expanded = replaceGroupedMacro(expanded, 'node', 2, ([, label]) => label)
  expanded = replaceGroupedMacro(expanded, 'ex', 1, ([number]) => number)
  return expanded.replace(/\\small\b/g, '')
}

function sanitizeNode(node: TiptapNode | null | undefined): TiptapNode | null {
  if (!node) return null
  if (node.type === 'text') return node.text ? node : null
  if (!node.content) return node
  return {
    ...node,
    content: node.content.map((child) => sanitizeNode(child)).filter((child): child is TiptapNode => child !== null),
  }
}

function cleanText(value: string) {
  return value
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\\textit\{([^{}]*)\}/g, '$1')
    .replace(/\\textsc\{([^{}]*)\}/g, '$1')
    .replace(/\\emph\{([^{}]*)\}/g, '$1')
    .replace(/\\href\{[^{}]*\}\{([^{}]*)\}/g, '$1')
    .replace(/\\(textbackslash|textasciicircum|textasciitilde)\{\}/g, (match) => ({
      '\\textbackslash{}': '\\',
      '\\textasciicircum{}': '^',
      '\\textasciitilde{}': '~',
    }[match] ?? match))
    .replace(/\\(?:bf|it|sc)\b/g, '')
    .replace(/\\([{}%&_#$])/g, '$1')
    .replace(/\\\\/g, ' ')
    .replace(/\[[0-9]+(?:\.[0-9]+)?ex\]/g, '')
    .replace(/[{}]/g, '')
    .trim()
}

function paragraph(value: string): TiptapNode | null {
  const text = cleanText(value.replace(/\s+/g, ' '))
  return text ? { type: 'paragraph', content: [textNode(text)] } : null
}

function environment(lines: string[], start: number, name: string) {
  const endToken = `\\end{${name}}`
  const content: string[] = []
  let index = start + 1
  while (index < lines.length && lines[index].trim() !== endToken) content.push(lines[index++])
  return { content, next: Math.min(index + 1, lines.length) }
}

function parseList(lines: string[], start: number, name: 'itemize' | 'enumerate') {
  const { content, next } = environment(lines, start, name)
  const items = content.filter((line) => /^\s*\\item\s+/.test(line)).map((line) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: [textNode(cleanText(line.replace(/^\s*\\item\s+/, '')))] }],
  }))
  return { node: { type: name === 'itemize' ? 'bulletList' : 'orderedList', content: items } as TiptapNode, next }
}

function parseTable(lines: string[], start: number, name = 'tabular') {
  const { content, next } = environment(lines, start, name)
  const cells = content
    .map((line) => line.replace(/\\\\\s*(?:\[[^\]]+\])?\s*$/, '').trim())
    .filter((line) => line && !/^\[[^\]]+\]$/.test(line) && !/^\\(toprule|midrule|bottomrule|hline)/.test(line))
    .map((line) => line.split('&').map((cell) => cleanText(cell)))
  const width = Math.max(1, ...cells.map((row) => row.length))
  const rows = cells.map((row, rowIndex) => ({
    type: 'tableRow',
    content: [...row, ...Array(width - row.length).fill('')].map((cell) => ({ type: rowIndex === 0 ? 'tableHeader' : 'tableCell', content: cell ? [textNode(cell)] : [] })),
  }))
  return { node: { type: 'table', content: rows } as TiptapNode, next }
}

export function latexToTiptap(source: string): TiptapNode {
  const expandedSource = expandSpecialMacros(source)
  const documentBody = expandedSource.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)?.[1] ?? expandedSource
  const lines = documentBody.split(/\r?\n/)
  const content: TiptapNode[] = []
  let index = 0
  let textBuffer: string[] = []

  const flushText = () => {
    const node = paragraph(textBuffer.join(' '))
    if (node) content.push(node)
    textBuffer = []
  }

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line || line.startsWith('%')) { flushText(); index += 1; continue }

    const heading = line.match(/^\\(section|subsection|subsubsection)\*?\{(.+)\}$/)
    if (heading) {
      flushText()
      const level = heading[1] === 'section' ? 1 : heading[1] === 'subsection' ? 2 : 3
      content.push({ type: 'heading', attrs: { level }, content: [textNode(cleanText(heading[2]))] })
      index += 1
      continue
    }

    const list = line.match(/^\\begin\{(itemize|enumerate)\}/)
    if (list) { flushText(); const parsed = parseList(lines, index, list[1] as 'itemize' | 'enumerate'); content.push(parsed.node); index = parsed.next; continue }
    if (line === '\\begin{figure}[h]' || line === '\\begin{figure}') {
      flushText()
      const parsed = environment(lines, index, 'figure')
      const imageLine = parsed.content.find((entry) => /\\includegraphics/.test(entry)) ?? ''
      const image = imageLine.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/)
      const caption = parsed.content.join(' ').match(/\\caption\{([^}]+)\}/)?.[1] ?? 'Figure'
      if (image) content.push({ type: 'image', attrs: { src: image[1], alt: cleanText(caption) } })
      index = parsed.next
      continue
    }
    if (/^\\begin\{(?:tabular|shortex)\}/.test(line)) {
      flushText()
      const tableName = line.startsWith('\\begin{shortex}') ? 'shortex' : 'tabular'
      const parsed = parseTable(lines, index, tableName)
      content.push(parsed.node)
      index = parsed.next
      continue
    }
    if (line === '\\begin{verbatim}') { flushText(); const parsed = environment(lines, index, 'verbatim'); content.push({ type: 'codeBlock', content: [textNode(parsed.content.join('\n'))] }); index = parsed.next; continue }
    if (line === '\\begin{quote}') { flushText(); const parsed = environment(lines, index, 'quote'); const node = paragraph(parsed.content.join(' ')); if (node) content.push({ type: 'blockquote', content: [node] }); index = parsed.next; continue }
    if (line === '\\tableofcontents') { flushText(); content.push({ type: 'tableOfContents' }); index += 1; continue }
    if (line === '\\hrulefill') { flushText(); content.push({ type: 'horizontalRule' }); index += 1; continue }

    const inlineEquation = line.match(/^\\\[([\s\S]*)\\\]$/)
    if (inlineEquation) { flushText(); content.push(paragraph(`$${inlineEquation[1].trim()}$`) as TiptapNode); index += 1; continue }

    const image = line.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/)
    if (image) {
      flushText()
      const caption = lines.slice(index, index + 3).join(' ').match(/\\caption\{([^}]+)\}/)?.[1] ?? 'Figure'
      content.push({ type: 'image', attrs: { src: image[1], alt: cleanText(caption) } })
      index += 1
      continue
    }

    if (line === '\\[') {
      flushText()
      const equation: string[] = []
      index += 1
      while (index < lines.length && lines[index].trim() !== '\\]') equation.push(lines[index++])
      content.push(paragraph(`$${equation.join(' ').trim()}$`) as TiptapNode)
      index += 1
      continue
    }

    textBuffer.push(line)
    index += 1
  }
  flushText()
  return sanitizeNode({ type: 'doc', content }) ?? { type: 'doc', content: [] }
}
