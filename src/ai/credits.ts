const WINDOW_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1_000

export type CreditLimits = {
  creditsPerDay: number
  requestsPerMinute: number
}

type Usage = {
  windowStartedAt: number
  requestsInWindow: number
  dayStartedAt: number
  creditsUsedToday: number
  bonusCreditsRemaining: number
}

export class CreditLimitError extends Error {
  constructor(readonly retryAfterSeconds: number, readonly creditsRemaining: number) {
    super('AI usage limit reached')
    this.name = 'CreditLimitError'
  }
}

export class InMemoryCreditStore {
  private readonly usage = new Map<string, Usage>()

  constructor(private readonly limits: CreditLimits) {}

  consume(clientId: string, credits = 1, initialBonusCredits = 0) {
    const now = Date.now()
    const current = this.usage.get(clientId)
    const usage = current && now - current.dayStartedAt < DAY_MS
      ? current
      : { windowStartedAt: now, requestsInWindow: 0, dayStartedAt: now, creditsUsedToday: 0, bonusCreditsRemaining: Math.max(0, initialBonusCredits) }

    if (now - usage.windowStartedAt >= WINDOW_MS) {
      usage.windowStartedAt = now
      usage.requestsInWindow = 0
    }

    const creditsRemaining = Math.max(0, this.limits.creditsPerDay - usage.creditsUsedToday) + usage.bonusCreditsRemaining
    if (usage.requestsInWindow >= this.limits.requestsPerMinute) {
      throw new CreditLimitError(Math.max(1, Math.ceil((WINDOW_MS - (now - usage.windowStartedAt)) / 1_000)), creditsRemaining)
    }
    const baseCredits = Math.min(credits, Math.max(0, this.limits.creditsPerDay - usage.creditsUsedToday))
    const bonusCredits = credits - baseCredits
    if (bonusCredits > usage.bonusCreditsRemaining) {
      throw new CreditLimitError(Math.max(1, Math.ceil((DAY_MS - (now - usage.dayStartedAt)) / 1_000)), creditsRemaining)
    }

    usage.requestsInWindow += 1
    usage.creditsUsedToday += baseCredits
    usage.bonusCreditsRemaining -= bonusCredits
    this.usage.set(clientId, usage)
    if (this.usage.size > 10_000) {
      for (const [storedClientId, storedUsage] of this.usage) {
        if (now - storedUsage.dayStartedAt >= DAY_MS) this.usage.delete(storedClientId)
      }
    }
    return { creditsRemaining: Math.max(0, this.limits.creditsPerDay - usage.creditsUsedToday) + usage.bonusCreditsRemaining }
  }

  getStatus(clientId: string, initialBonusCredits = 0) {
    const now = Date.now()
    const current = this.usage.get(clientId)
    const usage = current && now - current.dayStartedAt < DAY_MS ? current : null
    const windowStartedAt = usage && now - usage.windowStartedAt < WINDOW_MS ? usage.windowStartedAt : now
    const requestsInWindow = usage && now - usage.windowStartedAt < WINDOW_MS ? usage.requestsInWindow : 0
    const creditsUsedToday = usage?.creditsUsedToday ?? 0
    const bonusCreditsRemaining = usage?.bonusCreditsRemaining ?? Math.max(0, initialBonusCredits)
    const nextDay = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1))
    return {
      creditsUsedToday,
      creditsRemaining: Math.max(0, this.limits.creditsPerDay - creditsUsedToday) + bonusCreditsRemaining,
      bonusCreditsRemaining,
      requestsInWindow,
      dailyLimit: this.limits.creditsPerDay,
      requestsPerMinute: this.limits.requestsPerMinute,
      dayResetsAt: nextDay.toISOString(),
      windowResetsAt: new Date(windowStartedAt + WINDOW_MS).toISOString(),
    }
  }
}

export const aiCreditStore = new InMemoryCreditStore({
  creditsPerDay: Number(process.env.AI_CREDITS_PER_DAY ?? 20),
  requestsPerMinute: Number(process.env.AI_REQUESTS_PER_MINUTE ?? 5),
})
