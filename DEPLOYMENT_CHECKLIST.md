# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment (Local Testing)

- [ ] API key is in `.env.local` (not committed)
- [ ] `.env.local` is in `.gitignore` (verify with `git status`)
- [ ] `npm run build` passes without errors
- [ ] `vercel dev` starts successfully
- [ ] Chat works on http://localhost:3000
- [ ] Browser console shows no errors
- [ ] Questions increase confidence (test with "What is this?")
- [ ] One-word answers decrease confidence (test with "ok")
- [ ] Responses match expected personality for confidence level
- [ ] ASCII art displays after each message

## Before Running `vercel --prod`

- [ ] Logged into Vercel: `vercel login`
- [ ] Project initialized with Vercel: `vercel link` (if needed)
- [ ] `git add . && git commit -m "Add LangGraph backend"` (commit changes)
- [ ] `.env.local` is NOT in any commit (verify: `git log -p | grep ANTHROPIC`)
- [ ] All environment files reviewed
  - [ ] `vercel.json` exists and is correct
  - [ ] `.env.example` is committed
  - [ ] `.env.local` is NOT committed

## Production Deployment

### Step 1: Deploy
```bash
vercel --prod
```
Wait for deployment to complete. Note the URL: `https://your-app.vercel.app`

### Step 2: Configure Environment
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your API key from console.anthropic.com
   - **Environments:** Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy with Environment
```bash
vercel --prod
```
Redeploy to apply the environment variable.

### Step 4: Test Live
1. Open your production URL: `https://your-app.vercel.app`
2. Type a message and verify:
   - [ ] Response appears
   - [ ] No 500 errors in console
   - [ ] Confidence updates
   - [ ] ASCII art displays

## Post-Deployment Verification

- [ ] Live URL works: `https://your-app.vercel.app`
- [ ] Chat is responsive (no backend delays)
- [ ] Questions increase confidence
- [ ] Personality changes at thresholds (25%, 50%, 75%)
- [ ] No console errors in browser DevTools
- [ ] No API errors (check Vercel Function logs)
- [ ] ASCII art displays correctly
- [ ] Audio cues work (if audio enabled)
- [ ] Mobile responsive
- [ ] Multiple messages in sequence work

## Monitoring (After Deployment)

### Weekly
- [ ] Check Vercel Analytics for errors
- [ ] Monitor API usage in Anthropic console
- [ ] Test with different user inputs

### Monthly
- [ ] Review Anthropic API costs
- [ ] Check Vercel Function performance
- [ ] Verify error rates are < 1%

## Emergency Rollback

If something breaks in production:

```bash
# Option 1: Revert to previous deployment
vercel --prod --confirm

# Option 2: Remove environment variable
# Go to Vercel Dashboard → Settings → Environment Variables
# Delete ANTHROPIC_API_KEY
# Redeploy (will use fallback error message)

# Option 3: Revert code in GitHub
git revert HEAD
git push
# Redeploy from Vercel dashboard
```

## Security Verification

Before going live:

- [ ] `ANTHROPIC_API_KEY` is NOT in any file committed to git
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.example` shows only template values
- [ ] Vercel Environment Variables are set (encrypted)
- [ ] No API keys in error messages
- [ ] Frontend never imports from `@anthropic-ai/sdk`
- [ ] All API calls go through `/api/analyze-user`

## Performance Baseline

After deployment, note these metrics for comparison:

- [ ] Response time: ___ ms (baseline)
- [ ] Error rate: ___% (should be < 1%)
- [ ] API usage: ___ requests/day
- [ ] Cost/message: ~$0.001

## DNS/Domain (Optional)

If using custom domain:

- [ ] Domain purchased and set up
- [ ] DNS records configured in Vercel
- [ ] SSL certificate auto-provisioned
- [ ] Custom domain works: `https://your-domain.com`

## Sharing Checklist

Before sharing publicly:

- [ ] No API keys in any visible code
- [ ] No console errors (verify with DevTools)
- [ ] README includes attribution
- [ ] Terms of service for Claude API understood
- [ ] API usage limits configured (if desired)

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Anthropic API Status: https://status.anthropic.com
- GitHub Issues: For bug reports

---

**All checked?** Your app is ready for the world! 🚀
