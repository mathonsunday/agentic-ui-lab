# Quick Start: LangGraph + Vercel Backend

Get the new backend running in 5 minutes.

## Prerequisites

- Node.js 20.x or later
- Anthropic API key (from https://console.anthropic.com)
- Vercel account (free tier is fine)

## Step 1: Local Setup (2 minutes)

```bash
# Get your API key from console.anthropic.com
# Replace the placeholder below with your actual key

# Create .env.local with your API key
cat > .env.local << 'EOF'
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
EOF
```

## Step 2: Install & Run (2 minutes)

```bash
# Install dependencies
npm install

# Start Vercel dev environment
npx vercel dev
```

Open http://localhost:3000 and test the chat!

## Step 3: Deploy to Vercel (1 minute)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Then add your API key to Vercel Environment Variables:
1. https://vercel.com/dashboard → your project
2. Settings → Environment Variables
3. Add `ANTHROPIC_API_KEY=sk-ant-...`

**Done!** Your app is now live with a secure backend.

## Verify It Works

### Local (http://localhost:3000)
Type a message in the Mira chat:
- You should see a response
- Browser console should show POST to `/api/analyze-user`
- Confidence should increase for questions

### Production (your-vercel-domain.vercel.app)
Same as above - click a message and verify the response

## Troubleshooting

**"Backend call failed"**
→ Is `vercel dev` running? Is `.env.local` set?

**"Missing ANTHROPIC_API_KEY"**
→ Check `.env.local` has the actual key (not `sk-ant-your-actual-key-here`)

**Confidence not updating**
→ Check browser console for Claude's analysis delta

**App crashes**
→ Check terminal where `vercel dev` is running for error logs

## Architecture Changed

- **Before**: Frontend called Claude directly (API key exposed in browser ❌)
- **After**: Frontend calls Vercel backend → Backend calls Claude (secure ✅)

Frontend still uses all the same hardcoded personality responses - nothing changed there!

## What Was Added

- Backend: `api/` folder with LangGraph agent
- API client: `src/services/miraBackendClient.ts`
- Config: `vercel.json`
- Docs: This file + `BACKEND_SETUP.md`

## Next Steps

- Read `BACKEND_SETUP.md` for full documentation
- Deploy to production when ready
- Monitor Claude API usage in console.anthropic.com

---

**Questions?** Check the error message in browser console or terminal output.
