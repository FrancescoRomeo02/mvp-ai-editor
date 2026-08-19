import type { Ai } from '@cloudflare/workers-types'

export type UsageStub = {
  consume(request: {
    credits: number
    creditsPerDay: number
    requestsPerMinute: number
    nowMs: number
    dayKey: string
    bonusCredits?: number
  }): Promise<{ creditsRemaining: number }>
  getStatus(request: {
    creditsPerDay: number
    requestsPerMinute: number
    nowMs: number
    dayKey: string
    bonusCredits?: number
  }): Promise<{
    creditsUsedToday: number
    creditsRemaining: number
    bonusCreditsRemaining: number
    requestsInWindow: number
    dailyLimit: number
    requestsPerMinute: number
    dayResetsAt: string
    windowResetsAt: string
  }>
}

export type CloudflareBindings = {
  AI: Ai
  USAGE: { getByName(name: string): UsageStub }
}
