# LangGraph + Vercel Backend Setup

This document explains the new backend architecture and how to deploy it.

## Overview

The application now uses a **LangGraph + Vercel Functions** backend to:
- Keep API keys secure (backend-only, never exposed in browser)
- Use Claude for intelligent user analysis
- Select curated hardcoded responses based on personality assessment
- Enable public deployment without security vulnerabilities

## Architecture Flow

```
User Input (Frontend)
  ↓
TerminalInterface.tsx calls evaluateUserResponseWithBackend()
  ↓
Frontend assessment: assessResponse()
  - Detects question vs statement
  - Counts words for depth estimate
  - Returns ResponseAssessment {type, depth, confidenceDelta}
  ↓
POST /api/analyze-user (Backend)
  ↓
Vercel Function (api/analyze-user.ts)
  ↓
LangGraph Agent (api/lib/miraAgent.ts)
  1. analyzeUserInput() - Claude analyzes personality metrics
  2. updateConfidenceAndProfile() - Merge analysis with state
  3. selectResponse() - Pick hardcoded response by personality
  4. updateMemory() - Store interaction
  ↓
JSON Response: {updatedState, response}
  ↓
Frontend displays response + ASCII art
```

## Files

### Backend Files (New)
- **`api/analyze-user.ts`** - Main Vercel Function handler
- **`api/lib/miraAgent.ts`** - LangGraph agent orchestration
- **`api/lib/types.ts`** - Shared TypeScript types
- **`api/lib/responseLibrary.ts`** - Hardcoded personality responses
- **`vercel.json`** - Vercel deployment configuration

### Frontend Changes
- **`src/services/miraBackendClient.ts`** - New API client (replaces direct Claude calls)
- **`src/shared/miraAgentSimulator.ts`** - Updated evaluateUserResponseWithBackend() to use backend
- **`package.json`** - Added @vercel/node dependency

### Security
- **`.env.local`** - **NOT COMMITTED** - Contains API key for local dev
- **`.env.example`** - Template showing what to configure
- **`.gitignore`** - Ensures .env.local never commits

## Local Development

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Set up environment

Copy `.env.example` to `.env.local` and add your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 3. Run with Vercel Functions

```bash
# Install dependencies
npm install

# Start dev server with Vercel Functions support
vercel dev
```

This starts:
- Frontend: http://localhost:3000
- Vercel Functions: http://localhost:3000/api/*
- Both connected and working together

### 4. Test the Backend

1. Open http://localhost:3000
2. Type a message in the Mira chat
3. Check browser console (F12) for:
   - POST request to `/api/analyze-user`
   - Response with updated confidence and response text

## Production Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Add LangGraph + Vercel backend"
git push origin main
```

### 2. Deploy to Vercel

Option A: Using Vercel CLI
```bash
vercel --prod
```

Option B: Using Vercel Dashboard
1. Go to https://vercel.com
2. Import this GitHub repository
3. Configure environment variables (see below)
4. Deploy

### 3. Add Environment Variables

In Vercel Dashboard:
1. Go to your project settings
2. Environment Variables
3. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your actual API key
   - **Environments:** Production, Preview, Development

## How It Works

### User Analysis (Claude)

When a user sends a message, Claude evaluates:
- **confidenceDelta**: How much to change Mira's trust (-10 to +15)
  - Questions: +12 to +15
  - Thoughtful responses: +10 to +12
  - One-word answers: -2 to 0
  - Rude/dismissive: -5 to -10

- **User Profile Metrics**:
  - thoughtfulness (0-100)
  - adventurousness (0-100)
  - engagement (0-100)
  - curiosity (0-100)
  - superficiality (0-100)

### Response Selection (LangGraph)

Based on Claude's analysis and personality:
1. Determine personality from confidence level:
   - 0-25%: "negative" (sarcastic)
   - 25-50%: "chaotic" (surreal)
   - 50-75%: "glowing" (praising)
   - 75-100%: "slovak" (poetic)

2. Select response from hardcoded library:
   - All 27+ responses preserved from original
   - No AI-generated text
   - Cycling prevents repeats within personality

3. Return with confidence level and ASCII art

## Troubleshooting

### "Backend call failed"
- Check if `vercel dev` is running
- Check `.env.local` has valid `ANTHROPIC_API_KEY`
- Check browser console for specific error

### "Missing ANTHROPIC_API_KEY"
- Ensure `.env.local` exists (not committed)
- Ensure it has `ANTHROPIC_API_KEY=sk-ant-...`
- On Vercel: Add to Environment Variables in dashboard

### API calls timing out
- Claude takes 500-1000ms to analyze
- Vercel Functions can take up to 60s
- If repeatedly timing out, check Claude API status

### Responses not changing
- Claude should give generous scores
- Questions get minimum +12
- If stuck at same personality, check console for Claude's actual deltas

## Fallback Behavior

If the backend is unavailable:
- App shows error message: "...connection to the depths lost..."
- Confidence stays same (no update)
- User can retry immediately
- No crash, graceful degradation

## Performance Notes

- Claude analysis: ~500-1000ms (varies by load)
- Vercel Function: <100ms overhead
- Frontend displays chunks while waiting
- Total perceived latency: Similar to before (3s animation)

## Cost Tracking

Each message = 1 Claude Haiku call (~$0.001)
- 100 messages = ~$0.10
- 1000 messages = ~$1.00
- Significantly cheaper than other Claude models

## Future Improvements

This architecture enables:
- **Multi-user sessions** - Track different users over time
- **Persistent memory** - Store interaction history in database
- **Dynamic personality** - Mira evolves based on patterns
- **Analytics** - Understand how users engage
- **Rate limiting** - Prevent API abuse

## Security Checklist

- ✅ API key never in frontend code
- ✅ API key only in `.env.local` (gitignored)
- ✅ Production: API key in Vercel Environment Variables (encrypted)
- ✅ Request validation on backend
- ✅ Error messages don't expose sensitive info
- ✅ No client-side API calls to Anthropic

---

**Ready to deploy!** Follow "Production Deployment" section above.
