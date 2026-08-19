import { Icon } from './Icon'

export function EditorToolbar({ onDownload }: { onDownload: () => void }) {
  return <div className="document-actions">
    <span className="save-status"><span className="save-status-dot" aria-hidden="true" />Autosaved</span>
    <button type="button" aria-label="Download LaTeX" onClick={onDownload}><Icon name="download" size={15} /> Download LaTeX</button>
  </div>
}
