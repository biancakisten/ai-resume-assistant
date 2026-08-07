// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import {
  AI_RATE_LIMITS,
  RedisCalendarLimiter,
  createLayeredAiRateLimiter,
  hashClientIp,
  nextUtcMonthStart,
} from './ai-rate-limit.js'

const now = new Date('2026-08-15T12:00:00.000Z')
const allowedWindow = () => ({
  limit: vi.fn().mockResolvedValue({
    reset: now.getTime() + 60_000,
    success: true,
  }),
})

describe('durable AI rate limiting', () => {
  it('allows a request through every durable layer', async () => {
    const minute = allowedWindow()
    const daily = allowedWindow()
    const calendar = {
      consume: vi.fn().mockResolvedValue({ allowed: true }),
    }
    const limiter = createLayeredAiRateLimiter({ calendar, daily, minute })

    await expect(limiter({ identifier: 'hashed-ip', now })).resolves.toEqual({
      allowed: true,
    })
    expect(minute.limit).toHaveBeenCalledWith('global')
    expect(daily.limit).toHaveBeenCalledWith('global')
    expect(calendar.consume).toHaveBeenCalledWith('hashed-ip', now)
  })

  it('blocks the global per-minute limit before later counters', async () => {
    const minute = {
      limit: vi.fn().mockResolvedValue({
        reset: now.getTime() + 60_000,
        success: false,
      }),
    }
    const daily = allowedWindow()
    const calendar = { consume: vi.fn() }
    const limiter = createLayeredAiRateLimiter({ calendar, daily, minute })

    await expect(limiter({ identifier: 'hashed-ip', now })).resolves.toEqual({
      allowed: false,
      reason: 'globalMinute',
      retryAfterSeconds: 60,
    })
    expect(daily.limit).not.toHaveBeenCalled()
    expect(calendar.consume).not.toHaveBeenCalled()
  })

  it('blocks the global daily limit before monthly counters', async () => {
    const minute = allowedWindow()
    const daily = {
      limit: vi.fn().mockResolvedValue({
        reset: now.getTime() + 86_400_000,
        success: false,
      }),
    }
    const calendar = { consume: vi.fn() }
    const limiter = createLayeredAiRateLimiter({ calendar, daily, minute })

    await expect(limiter({ identifier: 'hashed-ip', now })).resolves.toEqual({
      allowed: false,
      reason: 'globalDaily',
      retryAfterSeconds: 86_400,
    })
    expect(calendar.consume).not.toHaveBeenCalled()
  })

  it('blocks the third accepted request per identifier for the calendar month', async () => {
    const accepted = new Map<string, number>()
    const calendar = {
      consume: vi.fn(async (identifier: string) => {
        const current = accepted.get(identifier) ?? 0
        if (current >= AI_RATE_LIMITS.perIpMonthly) {
          return { allowed: false, reason: 'perIpMonthly' as const }
        }
        accepted.set(identifier, current + 1)
        return { allowed: true }
      }),
    }
    const limiter = createLayeredAiRateLimiter({
      calendar,
      daily: allowedWindow(),
      minute: allowedWindow(),
    })

    await expect(limiter({ identifier: 'same-hash', now })).resolves.toEqual({
      allowed: true,
    })
    await expect(limiter({ identifier: 'same-hash', now })).resolves.toEqual({
      allowed: true,
    })
    await expect(limiter({ identifier: 'same-hash', now })).resolves.toEqual({
      allowed: false,
      reason: 'perIpMonthly',
      retryAfterSeconds: 1_425_600,
    })
    expect(accepted.get('same-hash')).toBe(2)
  })

  it('uses one atomic Redis operation for both monthly counters and their expiry', async () => {
    const evalCommand = vi.fn().mockResolvedValue([1, 0])
    const calendar = new RedisCalendarLimiter({ eval: evalCommand })

    await expect(calendar.consume('hashed-ip', now)).resolves.toEqual({
      allowed: true,
    })

    expect(evalCommand).toHaveBeenCalledOnce()
    const [script, keys, args] = evalCommand.mock.calls[0]
    expect(script).toContain('redis.call("GET", KEYS[1])')
    expect(script).toContain('redis.call("GET", KEYS[2])')
    expect(script).toContain('redis.call("EXPIREAT", KEYS[1], reset_at)')
    expect(script).toContain('redis.call("EXPIREAT", KEYS[2], reset_at)')
    expect(keys).toEqual([
      'ai-resume-assistant:improve:month:2026-08:ip:hashed-ip',
      'ai-resume-assistant:improve:month:2026-08:global',
    ])
    expect(args).toEqual([2, 100, 1_788_220_800])
  })

  it('cannot admit more than two concurrent monthly requests for one identifier', async () => {
    let ipCount = 0
    let globalCount = 0
    const calendar = new RedisCalendarLimiter({
      eval: vi.fn(async (_script, _keys, args) => {
        const [ipLimit, globalLimit] = args as number[]
        if (ipCount >= ipLimit) return [0, 1]
        if (globalCount >= globalLimit) return [0, 2]
        ipCount += 1
        globalCount += 1
        return [1, 0]
      }),
    })

    const decisions = await Promise.all([
      calendar.consume('same-hash', now),
      calendar.consume('same-hash', now),
      calendar.consume('same-hash', now),
    ])

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(2)
    expect(decisions.filter((decision) => !decision.allowed)).toEqual([
      { allowed: false, reason: 'perIpMonthly' },
    ])
    expect(ipCount).toBe(2)
    expect(globalCount).toBe(2)
  })

  it('blocks the conservative global calendar-month limit', async () => {
    const limiter = createLayeredAiRateLimiter({
      calendar: {
        consume: vi
          .fn()
          .mockResolvedValue({ allowed: false, reason: 'globalMonthly' }),
      },
      daily: allowedWindow(),
      minute: allowedWindow(),
    })

    await expect(limiter({ identifier: 'another-hash', now })).resolves.toEqual(
      {
        allowed: false,
        reason: 'globalMonthly',
        retryAfterSeconds: 1_425_600,
      },
    )
    expect(AI_RATE_LIMITS.globalMonthly).toBe(100)
  })

  it('uses the next UTC calendar month and hashes IP identifiers', () => {
    expect(nextUtcMonthStart(now).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    )
    expect(
      nextUtcMonthStart(new Date('2026-12-31T23:59:59.000Z')).toISOString(),
    ).toBe('2027-01-01T00:00:00.000Z')
    const identifier = hashClientIp(
      '203.0.113.42',
      'a-test-secret-that-is-at-least-32-characters',
    )
    expect(identifier).toMatch(/^[a-f0-9]{64}$/)
    expect(identifier).not.toContain('203.0.113.42')
  })

  it('fails closed when a durable limiter layer is unavailable', async () => {
    const limiter = createLayeredAiRateLimiter({
      calendar: { consume: vi.fn() },
      daily: allowedWindow(),
      minute: { limit: vi.fn().mockRejectedValue(new Error('redis offline')) },
    })

    await expect(limiter({ identifier: 'hashed-ip', now })).rejects.toThrow(
      'durable rate limiter could not be reached',
    )
  })
})
