import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const AI_RATE_LIMITS = Object.freeze({
  globalDaily: 50,
  globalMinute: 10,
  globalMonthly: 100,
  perIpMonthly: 2,
})

const RATE_LIMIT_PREFIX = 'ai-resume-assistant:improve'
const REDIS_TIMEOUT_MS = 4_000

export type AiRateLimitReason =
  | 'globalDaily'
  | 'globalMinute'
  | 'globalMonthly'
  | 'perIpMonthly'

export type AiRateLimitDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: AiRateLimitReason
      retryAfterSeconds: number
    }

export interface AiRateLimitInput {
  identifier: string
  now: Date
}

export type AiRequestRateLimiter = (
  input: AiRateLimitInput,
) => Promise<AiRateLimitDecision>

interface WindowLimitResult {
  reset: number
  success: boolean
}

interface WindowLimiter {
  limit(identifier: string): Promise<WindowLimitResult>
}

export interface CalendarLimitResult {
  allowed: boolean
  reason?: 'globalMonthly' | 'perIpMonthly'
}

export interface CalendarLimiter {
  consume(identifier: string, now: Date): Promise<CalendarLimitResult>
}

interface LayeredLimiterDependencies {
  calendar: CalendarLimiter
  daily: WindowLimiter
  minute: WindowLimiter
}

export interface RedisEvalClient {
  eval(
    script: string,
    keys: string[],
    args: unknown[],
  ): Promise<unknown>
}

export interface AiRateLimitEnvironment {
  AI_RATE_LIMIT_IP_HASH_SECRET?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  UPSTASH_REDIS_REST_URL?: string
}

export class AiRateLimitConfigurationError extends Error {}

export class AiRateLimitUnavailableError extends Error {}

const CALENDAR_LIMIT_SCRIPT = `
local ip_count = tonumber(redis.call("GET", KEYS[1]) or "0")
local global_count = tonumber(redis.call("GET", KEYS[2]) or "0")
local ip_limit = tonumber(ARGV[1])
local global_limit = tonumber(ARGV[2])
local reset_at = tonumber(ARGV[3])

if ip_count >= ip_limit then
  return {0, 1}
end

if global_count >= global_limit then
  return {0, 2}
end

ip_count = redis.call("INCR", KEYS[1])
redis.call("EXPIREAT", KEYS[1], reset_at)

global_count = redis.call("INCR", KEYS[2])
redis.call("EXPIREAT", KEYS[2], reset_at)

return {1, 0}
`

function requireEnvironmentValue(
  environment: AiRateLimitEnvironment,
  name: keyof AiRateLimitEnvironment,
): string {
  const value = environment[name]?.trim()
  if (!value) {
    throw new AiRateLimitConfigurationError(
      `The required ${name} environment variable is missing.`,
    )
  }
  return value
}

export function nextUtcMonthStart(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  )
}

function calendarMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function retryAfterSeconds(resetAt: number, now: Date): number {
  return Math.max(1, Math.ceil((resetAt - now.getTime()) / 1_000))
}

export function hashClientIp(ipAddress: string, secret: string): string {
  return createHmac('sha256', secret).update(ipAddress).digest('hex')
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
  const address = forwarded?.split(',', 1)[0]?.trim()
  return address && isIP(address) !== 0 ? address : null
}

export class RedisCalendarLimiter implements CalendarLimiter {
  constructor(private readonly redis: RedisEvalClient) {}

  async consume(
    identifier: string,
    now: Date,
  ): Promise<CalendarLimitResult> {
    const month = calendarMonth(now)
    const resetAt = nextUtcMonthStart(now)
    const result = await this.redis.eval(
      CALENDAR_LIMIT_SCRIPT,
      [
        `${RATE_LIMIT_PREFIX}:month:${month}:ip:${identifier}`,
        `${RATE_LIMIT_PREFIX}:month:${month}:global`,
      ],
      [
        AI_RATE_LIMITS.perIpMonthly,
        AI_RATE_LIMITS.globalMonthly,
        Math.floor(resetAt.getTime() / 1_000),
      ],
    )

    if (!Array.isArray(result) || result.length !== 2) {
      throw new AiRateLimitUnavailableError(
        'The durable rate limiter returned an invalid response.',
      )
    }
    if (Number(result[0]) === 1) return { allowed: true }
    if (Number(result[1]) === 1) {
      return { allowed: false, reason: 'perIpMonthly' }
    }
    if (Number(result[1]) === 2) {
      return { allowed: false, reason: 'globalMonthly' }
    }
    throw new AiRateLimitUnavailableError(
      'The durable rate limiter returned an unknown decision.',
    )
  }
}

export function createLayeredAiRateLimiter(
  dependencies: LayeredLimiterDependencies,
): AiRequestRateLimiter {
  return async ({ identifier, now }) => {
    try {
      const minute = await dependencies.minute.limit('global')
      if (!minute.success) {
        return {
          allowed: false,
          reason: 'globalMinute',
          retryAfterSeconds: retryAfterSeconds(minute.reset, now),
        }
      }

      const daily = await dependencies.daily.limit('global')
      if (!daily.success) {
        return {
          allowed: false,
          reason: 'globalDaily',
          retryAfterSeconds: retryAfterSeconds(daily.reset, now),
        }
      }

      const calendar = await dependencies.calendar.consume(identifier, now)
      if (calendar.allowed) return { allowed: true }

      return {
        allowed: false,
        reason: calendar.reason ?? 'globalMonthly',
        retryAfterSeconds: retryAfterSeconds(
          nextUtcMonthStart(now).getTime(),
          now,
        ),
      }
    } catch (error) {
      if (error instanceof AiRateLimitUnavailableError) throw error
      throw new AiRateLimitUnavailableError(
        'The durable rate limiter could not be reached.',
        { cause: error },
      )
    }
  }
}

export function createUpstashAiRateLimiter(
  environment: AiRateLimitEnvironment,
): AiRequestRateLimiter {
  const configuredUrl = requireEnvironmentValue(
    environment,
    'UPSTASH_REDIS_REST_URL',
  )
  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new AiRateLimitConfigurationError(
      'UPSTASH_REDIS_REST_URL must be a valid HTTPS URL.',
    )
  }
  if (url.protocol !== 'https:') {
    throw new AiRateLimitConfigurationError(
      'UPSTASH_REDIS_REST_URL must be a valid HTTPS URL.',
    )
  }
  const token = requireEnvironmentValue(
    environment,
    'UPSTASH_REDIS_REST_TOKEN',
  )
  const redis = new Redis({
    signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    token,
    url: url.toString(),
  })

  const sharedConfiguration = {
    analytics: false,
    ephemeralCache: false as const,
    redis,
    timeout: 0,
  }

  return createLayeredAiRateLimiter({
    calendar: new RedisCalendarLimiter(redis),
    daily: new Ratelimit({
      ...sharedConfiguration,
      limiter: Ratelimit.fixedWindow(AI_RATE_LIMITS.globalDaily, '1 d'),
      prefix: `${RATE_LIMIT_PREFIX}:day`,
    }),
    minute: new Ratelimit({
      ...sharedConfiguration,
      limiter: Ratelimit.fixedWindow(AI_RATE_LIMITS.globalMinute, '1 m'),
      prefix: `${RATE_LIMIT_PREFIX}:minute`,
    }),
  })
}

export function rateLimitHashSecret(
  environment: AiRateLimitEnvironment,
): string {
  const secret = requireEnvironmentValue(
    environment,
    'AI_RATE_LIMIT_IP_HASH_SECRET',
  )
  if (secret.length < 32) {
    throw new AiRateLimitConfigurationError(
      'AI_RATE_LIMIT_IP_HASH_SECRET must contain at least 32 characters.',
    )
  }
  return secret
}
