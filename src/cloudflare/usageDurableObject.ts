import { DurableObject } from 'cloudflare:workers'

export type UsageRequest = {
  credits: number
  creditsPerDay: number
  requestsPerMinute: number
  nowMs: number
  dayKey: string
  bonusCredits?: number
}

export type UsageResult = {
  creditsRemaining: number
  retryAfterSeconds?: number
}

export type UsageStatus = {
  creditsUsedToday: number
  creditsRemaining: number
  bonusCreditsRemaining: number
  requestsInWindow: number
  dailyLimit: number
  requestsPerMinute: number
  dayResetsAt: string
  windowResetsAt: string
}

export class UsageDurableObject extends DurableObject {
  private initialized = false

  private ensureSchema() {
    if (this.initialized) return
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        day_key TEXT NOT NULL,
        credits_used INTEGER NOT NULL DEFAULT 0,
        bonus_credits_remaining INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL,
        requests_in_window INTEGER NOT NULL DEFAULT 0
      )
    `)
    try {
      this.ctx.storage.sql.exec('ALTER TABLE usage ADD COLUMN bonus_credits_remaining INTEGER NOT NULL DEFAULT 0')
    } catch {
      // The column already exists on newly created objects or after a prior request.
    }
    this.initialized = true
  }

  async consume(request: UsageRequest): Promise<UsageResult> {
    this.ensureSchema()
    const current = this.ctx.storage.sql.exec<{
      day_key: string
      credits_used: number
      bonus_credits_remaining: number
      window_started_at: number
      requests_in_window: number
    }>('SELECT day_key, credits_used, bonus_credits_remaining, window_started_at, requests_in_window FROM usage WHERE id = 1').toArray()[0]

    const isNewDay = !current || current.day_key !== request.dayKey
    const windowExpired = !current || request.nowMs - current.window_started_at >= 60_000
    const creditsUsed = isNewDay ? 0 : current.credits_used
    const bonusRemaining = current ? current.bonus_credits_remaining : Math.max(0, request.bonusCredits ?? 0)
    const windowStartedAt = isNewDay || windowExpired ? request.nowMs : current.window_started_at
    const requestsInWindow = isNewDay || windowExpired ? 0 : current.requests_in_window
    const creditsRemaining = Math.max(0, request.creditsPerDay - creditsUsed) + bonusRemaining

    if (requestsInWindow >= request.requestsPerMinute) {
      throw new Error(JSON.stringify({
        code: 'RATE_LIMIT',
        creditsRemaining,
        retryAfterSeconds: Math.max(1, Math.ceil((60_000 - (request.nowMs - windowStartedAt)) / 1_000)),
      }))
    }
    const baseCredits = Math.min(request.credits, Math.max(0, request.creditsPerDay - creditsUsed))
    const bonusCredits = request.credits - baseCredits
    if (bonusCredits > bonusRemaining) {
      throw new Error(JSON.stringify({ code: 'DAILY_LIMIT', creditsRemaining, retryAfterSeconds: 86_400 }))
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO usage (id, day_key, credits_used, bonus_credits_remaining, window_started_at, requests_in_window)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET day_key = excluded.day_key,
         credits_used = excluded.credits_used,
         bonus_credits_remaining = excluded.bonus_credits_remaining,
         window_started_at = excluded.window_started_at,
         requests_in_window = excluded.requests_in_window`,
      request.dayKey,
      creditsUsed + baseCredits,
      bonusRemaining - bonusCredits,
      windowStartedAt,
      requestsInWindow + 1,
    )

    return { creditsRemaining: Math.max(0, request.creditsPerDay - creditsUsed - baseCredits) + bonusRemaining - bonusCredits }
  }

  async getStatus(request: UsageRequest): Promise<UsageStatus> {
    this.ensureSchema()
    const current = this.ctx.storage.sql.exec<{
      day_key: string
      credits_used: number
      bonus_credits_remaining: number
      window_started_at: number
      requests_in_window: number
    }>('SELECT day_key, credits_used, bonus_credits_remaining, window_started_at, requests_in_window FROM usage WHERE id = 1').toArray()[0]
    const isNewDay = !current || current.day_key !== request.dayKey
    const windowExpired = !current || request.nowMs - current.window_started_at >= 60_000
    const creditsUsedToday = isNewDay ? 0 : current.credits_used
    const bonusCreditsRemaining = current ? current.bonus_credits_remaining : Math.max(0, request.bonusCredits ?? 0)
    const windowStartedAt = isNewDay || windowExpired ? request.nowMs : current.window_started_at
    const requestsInWindow = isNewDay || windowExpired ? 0 : current.requests_in_window
    const nextUtcDay = new Date(Date.UTC(new Date(request.nowMs).getUTCFullYear(), new Date(request.nowMs).getUTCMonth(), new Date(request.nowMs).getUTCDate() + 1))
    return {
      creditsUsedToday,
      creditsRemaining: Math.max(0, request.creditsPerDay - creditsUsedToday) + bonusCreditsRemaining,
      bonusCreditsRemaining,
      requestsInWindow,
      dailyLimit: request.creditsPerDay,
      requestsPerMinute: request.requestsPerMinute,
      dayResetsAt: nextUtcDay.toISOString(),
      windowResetsAt: new Date(windowStartedAt + 60_000).toISOString(),
    }
  }
}
