import { useEffect, useRef } from 'react'
import type { SlashCommandId } from '../editor/slashCommands'

type SlashMenuItem = { id: SlashCommandId; label: string; hint: string; example: string; preview: string }

export function SlashMenu({ items, activeIndex, onSelect }: { items: readonly SlashMenuItem[]; activeIndex: number; onSelect: (id: SlashCommandId) => void }) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeItemRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [activeIndex])

  return <div className="slash-menu" role="menu" aria-label="Insert block">
    <div className="slash-menu-label">Matching blocks</div>
    <div className="slash-menu-list">
      {items.map((item, index) => <button
        key={item.id}
        id={`slash-option-${item.id}`}
        ref={index === activeIndex ? activeItemRef : undefined}
        type="button"
        role="menuitem"
        aria-selected={index === activeIndex}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onSelect(item.id)}
      >
        <span className="slash-item-copy"><strong>{item.label}</strong><small>{item.hint}</small></span>
        <span className={`slash-item-preview is-${item.preview}`} aria-hidden="true">{item.preview === 'bullet' ? <><i />{item.example}</> : item.preview === 'table' ? <><i /><i />{item.example}</> : item.preview === 'image' ? <><i />{item.example}</> : item.preview === 'formula' ? <em>{item.example}</em> : item.example}</span>
      </button>)}
    </div>
    <div className="slash-menu-footer">↑↓ navigate <span>Enter select</span><span>Esc close</span></div>
  </div>
}
