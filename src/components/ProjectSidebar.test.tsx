import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectSidebar } from './ProjectSidebar'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

describe('ProjectSidebar', () => {
  it('shows project files and document outline', () => {
    render(<ProjectSidebar outline={[{ id: 'intro-0', label: 'Introduzione', level: 1 }]} onOutlineSelect={vi.fn()} />)
    expect(screen.getByRole('complementary', { name: 'Project navigation' })).toBeInTheDocument()
    expect(screen.getByText('Project files')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'main file' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Introduzione' })).toBeInTheDocument()
  })

  it('explains empty outline state', () => {
    render(<ProjectSidebar outline={[]} onOutlineSelect={vi.fn()} />)
    expect(screen.getByText(/Type/)).toBeInTheDocument()
  })

  it('collapses and expands project folders', async () => {
    const user = userEvent.setup()
    render(<ProjectSidebar outline={[]} onOutlineSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Paper folder' }))
    expect(screen.queryByRole('button', { name: 'main file' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Paper folder' }))
    expect(screen.getByRole('button', { name: 'main file' })).toBeInTheDocument()
  })

  it('creates folders, files and uploads documents into the active folder', async () => {
    const user = userEvent.setup()
    render(<ProjectSidebar outline={[]} onOutlineSelect={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'New folder' }))
    await user.type(screen.getByLabelText('Folder name'), 'chapters')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('button', { name: 'chapters folder' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New file' }))
    await user.clear(screen.getByLabelText('Document name'))
    await user.type(screen.getByLabelText('Document name'), 'draft.md')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('button', { name: 'draft file' })).toBeInTheDocument()

    const upload = screen.getByLabelText('Upload files')
    await user.upload(upload, new File(['# Caricato'], 'uploaded.md', { type: 'text/markdown' }))
    expect(await screen.findByRole('button', { name: 'uploaded file' })).toBeInTheDocument()
  })
})
