import { describe, expect, it, vi } from 'vitest'
import { CreditLimitError, InMemoryCreditStore } from './credits'

describe('InMemoryCreditStore', () => {
  it('enforces per-minute requests and daily credits', () => {
    const store = new InMemoryCreditStore({ creditsPerDay: 2, requestsPerMinute: 1 })
    expect(store.consume('user-1')).toEqual({ creditsRemaining: 1 })
    expect(() => store.consume('user-1')).toThrow(CreditLimitError)

    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)
    expect(store.consume('user-1')).toEqual({ creditsRemaining: 0 })
    expect(() => store.consume('user-1')).toThrow(CreditLimitError)
    vi.useRealTimers()
  })

  it('keeps signup bonus credits separate from the daily quota', () => {
    vi.useFakeTimers()
    const store = new InMemoryCreditStore({ creditsPerDay: 1, requestsPerMinute: 10 })
    expect(store.consume('user-2', 1, 2)).toEqual({ creditsRemaining: 2 })
    expect(store.getStatus('user-2', 2)).toMatchObject({ creditsUsedToday: 1, bonusCreditsRemaining: 2, creditsRemaining: 2 })
    expect(store.consume('user-2', 1, 2)).toEqual({ creditsRemaining: 1 })
    expect(store.consume('user-2', 1, 2)).toEqual({ creditsRemaining: 0 })
    expect(() => store.consume('user-2', 1, 2)).toThrow(CreditLimitError)
    vi.useRealTimers()
  })
})
