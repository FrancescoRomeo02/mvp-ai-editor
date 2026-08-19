export type AIMessageRole = 'system' | 'user' | 'assistant'

export type AIChatMessage = {
  role: AIMessageRole
  content: string
}

export type AIChatRequest = {
  messages: AIChatMessage[]
  model?: string
  maxOutputTokens?: number
}

export type AIEditorContext = {
  fileName: string
  documentMarkdown: string
  activeBlockMarkdown: string
  activeBlockIndex: number
  activeBlockType: string
  selectionText: string
}

export type AIIntent = 'conversation' | 'insert' | 'modify'
export type AIEditOperation = 'none' | 'replace_current' | 'insert_after_current' | 'append'

export type AIEditProposal = {
  intent?: Exclude<AIIntent, 'conversation'>
  operation: AIEditOperation
  blockType: string
  markdown: string
  targetIndex?: number
}

export type AIChatResponse = {
  content: string
  model?: string
  intent?: AIIntent
  edit?: AIEditProposal
}

export interface AIProvider {
  chat(request: AIChatRequest): Promise<AIChatResponse>
}

export class AIProviderError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfterSeconds?: number) {
    super(message)
    this.name = 'AIProviderError'
  }
}
