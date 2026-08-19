import type { FormEvent } from 'react'
import type { AIChatMessage, AIEditProposal } from '../ai/types'

type AIChatProps = {
  messages: AIChatMessage[]
  input: string
  loading: boolean
  error: string | null
  creditsRemaining: number | null
  fileName: string
  edit: AIEditProposal | null
  editState: 'pending' | 'confirmed' | null
  canApplyEdit: boolean
  onInputChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  onApplyEdit: () => void
  onConfirmEdit: () => void
  onUndoEdit: () => void
}

export function AIChat({ messages, input, loading, error, creditsRemaining, fileName, edit, editState, canApplyEdit, onInputChange, onSubmit, onClose, onApplyEdit, onConfirmEdit, onUndoEdit }: AIChatProps) {
  const hasConversationResult = messages.some((message) => message.role === 'assistant') && !editState && !edit

  return (
    <section className={`ai-chat-panel${hasConversationResult || editState || error ? ' has-result' : ''}`} role="dialog" aria-label="AI assistant">
      <button type="button" className="ai-chat-close" aria-label="Close AI assistant" onClick={onClose}>×</button>
      <div className="ai-chat-results" aria-live="polite">
        {messages.filter((message) => message.role === 'user').map((message, index) => (
          <p key={`user-${index}`} className="ai-chat-user-message">{message.content}</p>
        ))}
        {loading && <p className="ai-chat-loading"><span className="ai-chat-loading-dot" />Thinking about the document…</p>}
        {error && <p className="ai-chat-error" role="alert">{error}</p>}
        {hasConversationResult && messages.filter((message) => message.role === 'assistant').map((message, index) => (
          <div key={`assistant-${index}`} className="ai-chat-response">
            <p>{message.content}</p>
            <button type="button" className="ai-open-chat" aria-label="Open chat (coming soon)" disabled>▱</button>
          </div>
        ))}
        {edit ? <div className="ai-edit-card">
          <div className="ai-edit-card-header"><span>Suggested file change</span><strong>{edit.blockType}</strong></div>
          <pre>{edit.markdown}</pre>
          <div className="ai-edit-actions">
            {canApplyEdit ? <button type="button" className="ai-edit-apply" onClick={onApplyEdit}>Apply to file</button> : <span className="ai-edit-disabled">Select a Markdown or LaTeX file</span>}
            <button type="button" onClick={onUndoEdit}>Keep editing</button>
          </div>
        </div> : editState ? <div className="ai-edit-result">
          <span className="ai-result-mark" aria-hidden="true">✦</span>
          <strong>Page updated!</strong>
          <div className="ai-result-actions">
            <button type="button" aria-label="Helpful (coming soon)" disabled>♡</button>
            <button type="button" aria-label="Not helpful (coming soon)" disabled>♧</button>
            <button type="button" className="ai-result-chat" aria-label="Open chat (coming soon)" disabled>▱ <span>Chat</span></button>
            <button type="button" className="ai-result-undo" aria-label="Undo change" onClick={onUndoEdit}>↶</button>
            <button type="button" className="ai-result-confirm" aria-label="Keep change" onClick={onConfirmEdit}>✓</button>
          </div>
        </div> : null}
      </div>
      <form className="ai-chat-form" onSubmit={onSubmit}>
        <div className="ai-composer-row">
          <span className="ai-chat-mark" aria-hidden="true">✦</span>
          <textarea id="ai-chat-input" value={input} onChange={(event) => onInputChange(event.target.value)} placeholder="Edit with AI" rows={1} autoFocus aria-label={`Edit ${fileName} with AI`} />
          <button type="submit" aria-label="Send request" disabled={loading || !input.trim()}>↑</button>
        </div>
        {creditsRemaining !== null && <span className="ai-credit-hint">{creditsRemaining} credits left</span>}
      </form>
    </section>
  )
}
