import type { OutlineItem } from '../editor/outline'

export function Outline({ items, onSelect }: { items: OutlineItem[]; onSelect: (item: OutlineItem) => void }) {
  if (items.length === 0) return <p className="outline-empty">Type `/title` to build your paper outline.</p>

  return (
    <nav aria-label="Document outline" className="outline">
      {items.map((item) => <button key={item.id} type="button" className={`outline-item level-${item.level}`} onClick={() => onSelect(item)}>{item.label}</button>)}
    </nav>
  )
}
