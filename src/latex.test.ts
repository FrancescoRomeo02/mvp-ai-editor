import { describe, expect, it } from 'vitest'
import { tiptapToLatex } from './latex'

describe('tiptapToLatex', () => {
  it('serializes academic blocks as Pandoc-compatible LaTeX', () => {
    const latex = tiptapToLatex({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Introduzione' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Metodo' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Primo punto' }] }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Formula $E=mc^2$.' }] },
        { type: 'image', attrs: { src: 'figura.png', alt: 'Esperimento' } },
      ],
    })

    expect(latex).toContain('\\section{Introduzione}')
    expect(latex).toContain('\\subsection{Metodo}')
    expect(latex).toContain('\\begin{itemize}')
    expect(latex).toContain('\\item Primo punto')
    expect(latex).toContain('Formula $E=mc^2$.')
    expect(latex).toContain('\\includegraphics[width=\\linewidth]{figura.png}')
  })

  it('serializes tables and escapes LaTeX special characters', () => {
    const latex = tiptapToLatex({
      type: 'doc',
      content: [{ type: 'table', content: [
        { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'text', text: 'Colonna' }] }, { type: 'tableHeader', content: [{ type: 'text', text: 'Valore' }] }] },
        { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'text', text: 'A & B' }] }, { type: 'tableCell', content: [{ type: 'text', text: '10%' }] }] },
      ] }],
    })

    expect(latex).toContain('\\begin{tabular}{ll}')
    expect(latex).toContain('A \\& B & 10\\%')
    expect(latex).toContain('\\end{tabular}')
  })

  it('uses selected publisher document class', () => {
    expect(tiptapToLatex({ type: 'doc' }, 'acm')).toContain('\\documentclass[acmsmall]{acmart}')
    expect(tiptapToLatex({ type: 'doc' }, 'nature')).toContain('\\documentclass[12pt]{article}')
    expect(tiptapToLatex({ type: 'doc' }, 'nature')).toContain('\\usepackage[numbers,super,sort&compress]{natbib}')
  })

  it.each(['generic', 'acm', 'nature'] as const)('exports a complete generated paper for the %s style', (style) => {
    const latex = tiptapToLatex({
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'A generated paper' }] }],
    }, style)

    expect(latex).toContain('\\begin{document}')
    expect(latex).toContain('\\section{A generated paper}')
    expect(latex).toContain('\\end{document}')
    expect(latex.trim().length).toBeGreaterThan(100)
  })

  it('serializes paper workflow blocks without dropping content', () => {
    const latex = tiptapToLatex({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Dettagli' }] },
        { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Passo' }] }] }] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Verificato' }] }] }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Una citazione' }] }] },
        { type: 'horizontalRule' },
        { type: 'codeBlock', content: [{ type: 'text', text: 'print(1)' }] },
        { type: 'callout', attrs: { tone: 'note' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Note' }] }] },
        { type: 'attachment', attrs: { href: 'dati.csv', filename: 'dati.csv' } },
        { type: 'video', attrs: { src: 'https://video.example/demo' } },
        { type: 'tableOfContents' },
      ],
    })

    expect(latex).toContain('\\subsubsection{Dettagli}')
    expect(latex).toContain('\\begin{enumerate}')
    expect(latex).toContain('\\begin{itemize}')
    expect(latex).toContain('\\begin{quote}')
    expect(latex).toContain('\\hrulefill')
    expect(latex).toContain('\\begin{verbatim}')
    expect(latex).toContain('Note')
    expect(latex).toContain('dati.csv')
    expect(latex).toContain('\\url{https://video.example/demo}')
    expect(latex).toContain('\\tableofcontents')
  })
})
