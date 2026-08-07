# Final launch preparation

## Durable AI request limits

`POST /api/improve-resume-text` checks durable Upstash Redis limits only after
the method, content type, body size, request shape, supported field, style and
text length have been validated and immediately before the OpenAI request.

The production limits are:

- 10 eligible requests globally per fixed minute;
- 50 eligible requests globally per fixed UTC day;
- 2 accepted requests per HMAC-hashed IP per UTC calendar month; and
- 100 accepted requests globally per UTC calendar month.

The per-IP and global calendar-month counters are checked and incremented in a
single Redis operation. Their keys expire at the start of the next UTC calendar
month. A rejected monthly request does not increment either monthly counter.

No raw IP address or resume text is stored. Per-IP keys contain only an
HMAC-SHA-256 identifier generated with a server-only secret. Upstash analytics
and the SDK's ephemeral in-memory cache are disabled. Redis errors and missing
configuration fail closed before OpenAI is contacted. The Upstash HTTP client
has a four-second abort deadline; the rate-limit SDK's fail-open timeout is
disabled, so a timeout is handled as an unavailable limiter rather than an
allowed request.

The endpoint accepts the client address only from Vercel's
`x-vercel-forwarded-for` request header and validates the first value as an IPv4
or IPv6 address. It does not fall back to caller-controlled `x-forwarded-for` or
`x-real-ip` headers. A missing or malformed trusted header fails closed before
the limiter or OpenAI is called.

An admitted request consumes its monthly allowance immediately before the
OpenAI call. The allowance is not refunded if OpenAI later times out, returns an
error, or the caller cancels; a manual retry is a new eligible request and can
consume another allowance. This prevents provider-error retry loops from
bypassing the budget controls. The shorter global minute and day limits count
validated attempts, including an attempt subsequently rejected by a monthly
limit, while the atomic monthly counters increment only admitted requests.

Configure all of these server-only variables in every Vercel environment that
exposes AI assistance:

```text
OPENAI_API_KEY
OPENAI_MODEL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
AI_RATE_LIMIT_IP_HASH_SECRET
```

`AI_RATE_LIMIT_IP_HASH_SECRET` must be a random value of at least 32 characters.
It must not be exposed through a `VITE_` variable or committed to the repository.
Rotating this secret changes every per-IP identifier. Rotation therefore gives
clients a fresh per-IP allowance for the remainder of that month, although the
global limits still apply. Rotate deliberately—preferably at a UTC month
boundary—and keep the previous secret only in the deployment system for rollback;
never log or store it with rate-limit records.
