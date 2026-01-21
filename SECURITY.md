# Security Features

This document explains the security measures implemented in agentic-ui-lab to protect against abuse and unexpected API costs.

## Overview

Since this project uses the Anthropic API, we need to protect against:

- **Cost abuse**: Someone spamming requests and running up your API bill
- **Input abuse**: Extremely long messages that waste tokens
- **Invalid requests**: Malformed data that could cause errors

## Implemented Security Features

### 1. Rate Limiting ⚡

**What it does:** Limits each IP address to 20 requests per hour

**Why it matters:** Without rate limiting, anyone who finds your deployed URL could make thousands of requests and cost you hundreds of dollars.

**How it works:**

- Uses Upstash Redis (free tier) to track requests per IP
- Sliding window algorithm (smooth rate limiting)
- Returns a clear error message when limits are exceeded
- Automatically tracks usage in your Upstash dashboard

**Configuration:**

```typescript
// In api/lib/rateLimit.ts
Ratelimit.slidingWindow(20, "1 h"); // 20 requests per 1 hour

// Adjust as needed:
// - More restrictive: (10, '1 h')
// - More permissive: (50, '1 h')
// - Shorter window: (10, '10 m') for 10 per 10 minutes
```

**Testing:**
Try making 21 requests in quick succession - the 21st should return:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 57 minutes.",
  "limit": 20,
  "reset": 1705834800000
}
```

### 2. Input Validation 📏

**What it does:** Validates all user input before sending to Claude

**Why it matters:** Prevents someone from sending extremely long messages that would waste tokens and cost money.

**Validations applied:**

- **Max length**: 2000 characters per message (~500 tokens)
- **Type checking**: Ensures input is a string
- **State validation**: Checks that miraState has required fields

**Example error:**

```json
{
  "error": "INPUT_TOO_LONG",
  "message": "Input too long (max 2000 characters)"
}
```

### 3. Security Scanning 🔍

**What it does:** Semgrep security linter runs on every commit

**Configuration:**

```bash
npm run security  # Run security checks
```

**Pre-commit hook:** Security checks run automatically before commits (via Husky)

## Environment Variables

### Required

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Recommended (for rate limiting)

```env
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxx
```

**Note:** If Upstash credentials are missing, rate limiting is disabled (useful for local development, but NOT recommended for production).

## Deployment Checklist

Before deploying to Vercel:

- [ ] Add `ANTHROPIC_API_KEY` to Vercel environment variables
- [ ] Add `UPSTASH_REDIS_REST_URL` to Vercel environment variables
- [ ] Add `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables
- [ ] Run `npm run security` to check for vulnerabilities
- [ ] Set Vercel spending limits in your dashboard (Settings → Billing)
- [ ] Monitor API usage in Anthropic dashboard

## Monitoring

### Check rate limit usage

Visit your Upstash dashboard at https://console.upstash.com/

You'll see:

- Total requests
- Rate limit hits
- Top IP addresses making requests

### Check API costs

Visit https://console.anthropic.com/

Monitor:

- Token usage
- Cost per day/month
- Request patterns

## What's Still NOT Protected

This is an art project without user accounts, so we intentionally don't have:

- User authentication
- Password handling
- GDPR/privacy concerns
- SQL injection protection (no database)
- XSS protection beyond React defaults

For art projects, this is fine! The main risk is cost, not data breaches.

## Adjusting Rate Limits

If you find 20 requests/hour too restrictive or too permissive:

1. Edit `api/lib/rateLimit.ts`
2. Change the numbers in `Ratelimit.slidingWindow(20, '1 h')`
3. Deploy the change

**Recommended settings:**

- **Public art project**: 10 requests/hour (conservative)
- **Demo for friends**: 20 requests/hour (current setting)
- **Personal use**: 50 requests/hour (permissive)

## Testing Locally

```bash
# Start local dev server with Vercel functions
vercel dev

# The API will run at http://localhost:3000/api/analyze-user-stream

# Test rate limiting:
# Make 21 requests quickly - the 21st should fail with 429 status
```

## Cost Estimate

With current settings (20 requests/hour):

- Max requests/day: 480 (20 × 24)
- Tokens per request: ~500 (with 2000 char limit)
- Cost per day (worst case): ~$1.20 @ Claude Haiku pricing
- Monthly worst case: ~$36

This is assuming someone maxes out your rate limit 24/7, which is unlikely for an art project.

## Questions?

If you see unexpected costs:

1. Check Upstash dashboard for request patterns
2. Check Anthropic dashboard for token usage
3. Lower the rate limit if needed
4. Consider adding password protection (Vercel Edge Config)
