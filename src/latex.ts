export type TiptapNode = {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export type LatexStyleId = 'generic' | 'acm' | 'nature'

export const latexStyles: Record<LatexStyleId, { label: string; documentClass: string; source: string }> = {
  generic: { label: 'LaTeX standard', documentClass: 'article', source: 'Built-in' },
  acm: { label: 'ACM journal (acmsmall)', documentClass: 'acmart', source: 'templates/acm' },
  nature: { label: 'Nature', documentClass: 'article', source: 'Nature author instructions' },
}

const preambles: Record<LatexStyleId, string> = {
generic: String.raw`\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{graphicx}
\usepackage{amsmath}
\usepackage{booktabs}
\usepackage{hyperref}`,
  acm: String.raw`\documentclass[acmsmall]{acmart}
\usepackage{booktabs}`,
nature: String.raw`\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{graphicx}
\usepackage{amsmath}
\usepackage[numbers,super,sort&compress]{natbib}
\usepackage{booktabs}
\usepackage{hyperref}`,
}

function escapeLatex(value: string) {
  return value
    .split(/(\$[^$]*\$)/g)
    .map((part) => part.startsWith('$') ? part : part
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([{}%&_#])/g, '\\$1')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}'))
    .join('')
}

function renderInline(node: TiptapNode): string {
  if (node.type === 'hardBreak') return '\\\\'
  if (node.type === 'mention') return `@${escapeLatex(String(node.attrs?.label ?? node.attrs?.id ?? ''))}`
  if (node.type !== 'text') return renderChildren(node)
  let value = escapeLatex(node.text ?? '')
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') value = `\\textbf{${value}}`
    if (mark.type === 'italic') value = `\\textit{${value}}`
    if (mark.type === 'link') value = `\\href{${String(mark.attrs?.href ?? '')}}{${value}}`
  }
  return value
}

function renderChildren(node: TiptapNode) {
  return (node.content ?? []).map(renderInline).join('')
}

function renderTable(node: TiptapNode) {
  const rows = (node.content ?? []).map((row) => (row.content ?? []).map((cell) => renderChildren(cell)))
  const width = Math.max(1, ...rows.map((row) => row.length))
  const lines = rows.map((row, index) => {
    const values = [...row, ...Array(width - row.length).fill('')]
    return `${values.join(' & ')} \\\\${index === 0 ? '\\toprule' : ''}`
  })
  return `\\begin{table}[h]\n\\centering\n\\begin{tabular}{${'l'.repeat(width)}}\n\\toprule\n${lines.join('\n')}\n\\bottomrule\n\\end{tabular}\n\\end{table}`
}

function renderBlock(node: TiptapNode): string {
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level ?? 1)
    const command = level === 1 ? 'section' : level === 2 ? 'subsection' : 'subsubsection'
    return `\\${command}{${renderChildren(node)}}`
  }
  if (node.type === 'paragraph') return renderChildren(node)
  if (node.type === 'orderedList') {
    return `\\begin{enumerate}\n${(node.content ?? []).map((item) => `\\item ${renderChildren(item)}`).join('\n')}\n\\end{enumerate}`
  }
  if (node.type === 'taskList') {
    return `\\begin{itemize}\n${(node.content ?? []).map((item) => `\\item[${item.attrs?.checked ? '$\\boxtimes$' : '$\\square$'}] ${renderChildren(item)}`).join('\n')}\n\\end{itemize}`
  }
  if (node.type === 'blockquote') return `\\begin{quote}\n${(node.content ?? []).map(renderBlock).join('\n\n')}\n\\end{quote}`
  if (node.type === 'horizontalRule') return '\\hrulefill'
  if (node.type === 'codeBlock') return `\\begin{verbatim}\n${(node.content ?? []).map((child) => child.text ?? '').join('')}\n\\end{verbatim}`
  if (node.type === 'callout') return `\\begin{quote}\n\\textbf{Note.} ${ (node.content ?? []).map(renderBlock).join('\n\n')}\n\\end{quote}`
  if (node.type === 'columns') {
    const columns = node.content ?? []
    const width = `${Math.floor(0.94 / Math.max(columns.length, 1) * 100)}%`
    return columns.map((column) => `\\begin{minipage}[t]{${width}}\n${(column.content ?? []).map(renderBlock).join('\n\n')}\n\\end{minipage}`).join('\\hfill\n')
  }
  if (node.type === 'column') return (node.content ?? []).map(renderBlock).join('\n\n')
  if (node.type === 'image') {
    const src = String(node.attrs?.src ?? '')
    const alt = escapeLatex(String(node.attrs?.alt ?? 'Figure'))
    return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=\\linewidth]{${src}}\n\\caption{${alt}}\n\\end{figure}`
  }
  if (node.type === 'video') return `\\noindent\\textbf{Video:} \\url{${String(node.attrs?.src ?? '')}}`
  if (node.type === 'attachment') return `\\noindent\\textbf{Attachment:} ${escapeLatex(String(node.attrs?.filename ?? 'Attachment'))} \\url{${String(node.attrs?.href ?? '')}}`
  if (node.type === 'tableOfContents') return '\\tableofcontents'
  if (node.type === 'table') return renderTable(node)
  if (node.type === 'bulletList') {
    return `\\begin{itemize}\n${(node.content ?? []).map((item) => `\\item ${renderChildren(item)}`).join('\n')}\n\\end{itemize}`
  }
  if (node.type === 'listItem') return renderChildren(node)
  return renderChildren(node)
}

export function tiptapToLatex(document: TiptapNode, style: LatexStyleId = 'generic') {
  const body = (document.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
  return `${preambles[style]}\n\\begin{document}\n\n${body}\n\n\\end{document}\n`
}
