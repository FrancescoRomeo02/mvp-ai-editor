import { readFileSync } from 'node:fs'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlockEditor } from './BlockEditor'

afterEach(() => {
  cleanup()
  localStorage.clear()
})
beforeEach(() => {
  vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/figura.png')
  localStorage.setItem('paper-editor:latex-style', 'generic')
})

describe('BlockEditor', () => {
  it('starts with one editable block', () => {
    render(<BlockEditor />)
    expect(screen.getByRole('textbox', { name: 'Paper editor' })).toBeInTheDocument()
    expect(screen.queryByText('Untitled note')).not.toBeInTheDocument()
  })

  it('opens the AI chat from an empty paragraph with Space', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.keyboard(' ')
    expect(screen.getByRole('dialog', { name: 'AI assistant' })).toBeInTheDocument()
    expect(editor).not.toHaveTextContent(' ')
  })

  it('creates a new block when pressing Enter', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, 'Primo blocco{enter}Secondo blocco')
    expect(editor.querySelectorAll('p')).toHaveLength(2)
    expect(editor).toHaveTextContent('Primo bloccoSecondo blocco')
  })

  it('keeps export control and removes duplicate block buttons', () => {
    render(<BlockEditor />)
    expect(screen.queryByRole('combobox', { name: 'Stile LaTeX' })).not.toBeInTheDocument()
    expect(screen.queryByText('DOCUMENTO ACCADEMICO')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download LaTeX' })).toBeInTheDocument()
    expect(screen.queryByText('Anteprima LaTeX / Pandoc')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Anteprima LaTeX')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Title' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Table' })).not.toBeInTheDocument()
  })

  it('turns current block into a heading or bullet list', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/title{enter}Introduction{enter}/bullet{enter}')
    expect(editor.querySelector('h1')).toHaveTextContent('Introduction')
    expect(editor.querySelector('ul')).toBeInTheDocument()
  })

  it('inserts a table, image and mathematical formula', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/table{enter}')
    expect(editor.querySelector('table')).toBeInTheDocument()
    expect(editor.querySelectorAll('td, th')).toHaveLength(4)

    cleanup(); localStorage.clear()
    render(<BlockEditor />)
    const imageEditor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(imageEditor)
    await user.type(imageEditor, '/image{enter}')
    expect(imageEditor.querySelector('img')).toHaveAttribute('src', 'https://example.com/figura.png')

    cleanup(); localStorage.clear()
    render(<BlockEditor />)
    const formulaEditor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(formulaEditor)
    await user.type(formulaEditor, '/formula{enter}')
    expect(formulaEditor).toHaveTextContent('$E=mc^2$')
  })

  it('expands tables and allows writing after them', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/table{enter}')

    expect(screen.getByRole('button', { name: 'Add row' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add row' }))
    await user.click(screen.getByRole('button', { name: 'Add column' }))
    expect(editor.querySelectorAll('td, th')).toHaveLength(9)

    await user.click(editor.querySelector('td, th')!)
    await user.type(editor, 'Cell content')
    await user.keyboard('{Escape}')
    await user.type(editor, 'After escape')

    const paragraphs = editor.querySelectorAll('p')
    await user.click(paragraphs[paragraphs.length - 1])
    await user.type(editor, 'Text after table')
    expect(editor).toHaveTextContent('Text after table')

    const cells = editor.querySelectorAll('td, th')
    await user.click(cells[cells.length - 1])
    await user.type(editor, 'Last cell')
    await user.keyboard('{Enter}')
    await user.type(editor, 'After enter')
    expect(editor).toHaveTextContent('After enter')
  })

  it('inserts structural, reference and academic utility blocks', async () => {
    const user = userEvent.setup()
    const cases = [
      { command: '/numbered', selector: 'ol' },
      { command: '/todo', selector: '[data-type="taskList"]' },
      { command: '/quote', selector: 'blockquote' },
      { command: '/callout', selector: '[data-callout]' },
      { command: '/columns', selector: '[data-columns]' },
      { command: '/divider', selector: 'hr' },
      { command: '/code', selector: 'pre' },
      { command: '/tableofcontents', selector: '[data-table-of-contents]' },
      { command: '/mention', selector: '[data-type="mention"]' },
    ]

    for (const { command, selector } of cases) {
      render(<BlockEditor />)
      const editor = screen.getByRole('textbox', { name: 'Paper editor' })
      await user.click(editor)
      await user.type(editor, `${command}{enter}`)
      expect(editor.querySelector(selector), command).not.toBeNull()
      cleanup(); localStorage.clear()
    }
  })

  it('inserts video, attachment and internal link blocks', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'prompt').mockReturnValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    render(<BlockEditor />)
    let editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/video{enter}')
    expect(editor.querySelector('iframe')).toBeInTheDocument()

    cleanup(); localStorage.clear()
    vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/dati.csv')
    render(<BlockEditor />)
    editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/attachment{enter}')
    expect(editor.querySelector('[data-attachment]')).toHaveAttribute('href', 'https://example.com/dati.csv')

    cleanup(); localStorage.clear()
    vi.spyOn(window, 'prompt').mockReturnValue('#metodo')
    render(<BlockEditor />)
    editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/link{enter}')
    expect(editor.querySelector('a')).toHaveAttribute('href', '#metodo')
  })

  it('opens slash menu and inserts a filtered block with Enter', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/tit')
    expect(screen.getByRole('menu', { name: 'Insert block' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Title Main heading/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Table' })).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(editor.querySelector('h1')).toBeInTheDocument()
    expect(screen.queryByRole('menu', { name: 'Insert block' })).not.toBeInTheDocument()
  })

  it('navigates slash results with arrow keys', async () => {
    const user = userEvent.setup()
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/')

    const menuItems = screen.getAllByRole('menuitem')
    expect(menuItems[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(menuItems[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(editor.querySelector('h2')).toBeInTheDocument()
  })

  it('keeps generated LaTeX behind the download action', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    localStorage.setItem('paper-editor:latex-style', 'nature')
    render(<BlockEditor />)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    await user.click(editor)
    await user.type(editor, '/title{enter}Results')
    await user.click(screen.getByRole('button', { name: 'Download LaTeX' }))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalled()
    anchorClick.mockRestore()
  })

  it('asks for the LaTeX style only when creating a project', async () => {
    localStorage.removeItem('paper-editor:latex-style')
    const user = userEvent.setup()
    render(<BlockEditor />)
    expect(screen.getByRole('dialog', { name: 'Set your paper style' })).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Project LaTeX style' }), 'nature')
    await user.click(screen.getByRole('button', { name: 'Continue to workspace' }))
    expect(screen.queryByRole('dialog', { name: 'Set your paper style' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Stile LaTeX' })).not.toBeInTheDocument()
    expect(screen.queryByText('DOCUMENTO ACCADEMICO')).not.toBeInTheDocument()
  })

  it('loads a selected .tex file as editable visual blocks', async () => {
    localStorage.setItem('paper-editor:project-files', JSON.stringify([{
      id: 'paper', label: 'Paper', kind: 'folder', children: [
        { id: 'draft.tex', label: 'draft.tex', kind: 'file', mime: 'application/x-tex', content: '\\begin{document}\n\\section{Risultati}\nTesto importato.\n\\end{document}' },
      ],
    }]))
    const user = userEvent.setup()
    render(<BlockEditor />)
    const file = await screen.findByRole('button', { name: 'draft file' })
    await user.click(file)
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })
    expect(editor.querySelector('h1')).toHaveTextContent('Risultati')
    expect(editor).toHaveTextContent('Testo importato.')
    expect(screen.getByRole('button', { name: 'draft file' })).toHaveClass('is-active')
  })

  it('imports the linguistic paper fixture into the real editor schema', async () => {
    localStorage.setItem('paper-editor:project-files', JSON.stringify([{
      id: 'paper', label: 'Paper', kind: 'folder', children: [
        { id: 'main.tex', label: 'main.tex', kind: 'file', mime: 'application/x-tex', content: readFileSync('src/fixtures/main.tex', 'utf8') },
      ],
    }]))
    const user = userEvent.setup()
    render(<BlockEditor />)
    await user.click(await screen.findByRole('button', { name: 'main file' }))
    const editor = screen.getByRole('textbox', { name: 'Paper editor' })

    await waitFor(() => {
      expect(editor.querySelectorAll('h1, h2')).toHaveLength(3)
      expect(editor.querySelectorAll('table')).toHaveLength(2)
      expect(editor).toHaveTextContent('Topicalization from sentential subject:')
    })
  })

  it('downloads non-empty LaTeX after importing the linguistic fixture', async () => {
    localStorage.setItem('paper-editor:project-files', JSON.stringify([{
      id: 'paper', label: 'Paper', kind: 'folder', children: [
        { id: 'main.tex', label: 'main.tex', kind: 'file', mime: 'application/x-tex', content: readFileSync('src/fixtures/main.tex', 'utf8') },
      ],
    }]))
    const user = userEvent.setup()
    const createObjectURL = vi.fn().mockReturnValue('blob:imported')
    const revokeObjectURL = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })

    render(<BlockEditor />)
    await user.click(await screen.findByRole('button', { name: 'main file' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Paper editor' })).toHaveTextContent('Topicalization from sentential subject:'))
    await user.click(screen.getByRole('button', { name: 'Download LaTeX' }))

    const downloaded = createObjectURL.mock.calls[0][0] as Blob
    expect(downloaded.size).toBeGreaterThan(0)
    expect(anchorClick).toHaveBeenCalled()
    anchorClick.mockRestore()
  })
})
