import type { TiptapNode } from '../latex'

export type OutlineItem = {
  id: string
  label: string
  level: number
}

function slugify(value: string, index: number) {
  const slug = value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  return `${slug || 'sezione'}-${index}`
}

export function extractOutline(document: TiptapNode): OutlineItem[] {
  return (document.content ?? []).reduce<OutlineItem[]>((items, node, index) => {
    if (node.type !== 'heading') return items
    const label = (node.content ?? []).map((child) => child.text ?? '').join('') || 'Sezione senza titolo'
    items.push({ id: slugify(label, index), label, level: Number(node.attrs?.level ?? 1) })
    return items
  }, [])
}
