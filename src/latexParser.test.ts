import { describe, expect, it } from 'vitest'
import { latexToTiptap } from './latexParser'

describe('latexToTiptap', () => {
  it('parses common paper LaTeX into editable TipTap blocks', () => {
    const document = latexToTiptap(String.raw`\documentclass{article}
\begin{document}
\section{Introduzione}
Testo del paper.

\subsection{Metodo}
\begin{itemize}
\item Primo punto
\item Secondo punto
\end{itemize}

\begin{figure}[h]
\includegraphics[width=\linewidth]{figura.png}
\caption{Esperimento}
\end{figure}

\[E=mc^2\]
\begin{tabular}{ll}
Colonna & Valore \\
A & 10 \\
\end{tabular}
\end{document}`)

    expect(document.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'heading', attrs: { level: 1 } }),
      expect.objectContaining({ type: 'heading', attrs: { level: 2 } }),
      expect.objectContaining({ type: 'bulletList' }),
      expect.objectContaining({ type: 'image', attrs: expect.objectContaining({ src: 'figura.png', alt: 'Esperimento' }) }),
      expect.objectContaining({ type: 'paragraph', content: [{ type: 'text', text: '$E=mc^2$' }] }),
      expect.objectContaining({ type: 'table' }),
    ]))
  })

  it('removes empty text nodes from sparse LaTeX structures', () => {
    const document = latexToTiptap(String.raw`\begin{document}
\section{}
\begin{itemize}
\item
\item Filled item
\end{itemize}
\begin{tabular}{ll}
 & Value \\
Name & \\
\end{tabular}
\[
\]
\end{document}`)

    expect(JSON.stringify(document)).not.toContain('"text":""')
  })
})
