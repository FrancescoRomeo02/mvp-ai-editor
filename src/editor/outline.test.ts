import { describe, expect, it } from 'vitest'
import { extractOutline } from './outline'

describe('extractOutline', () => {
  it('builds a navigable hierarchy from heading blocks', () => {
    expect(extractOutline({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Introduzione' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Testo' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Metodo' }] },
      ],
    })).toEqual([
      { id: 'introduzione-0', label: 'Introduzione', level: 1 },
      { id: 'metodo-2', label: 'Metodo', level: 2 },
    ])
  })
})
