# Hue Q&A Setup - Quick Guide

## Issue: Hue Says "I'm currently unable to answer questions"

This message appears when the `GOOGLE_GENAI_API_KEY` environment variable is not configured.

## Solution: Set Up Google GenAI API Key

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or go to "API Keys" section
4. Create a new API key
5. Copy the API key (it will look like: `AIza...`)

### Step 2: Add to Vercel (Production)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Name: `GOOGLE_GENAI_API_KEY`
5. Value: Paste your API key
6. Select environments: **Production**, **Preview**, **Development** (or as needed)
7. Click **Save**
8. **Redeploy** your application for changes to take effect

### Step 3: Add to Local Development (Optional)

If testing locally, add to `.env.local`:

```bash
GOOGLE_GENAI_API_KEY=your_api_key_here
```

**Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Verify It's Working

After setting the API key and redeploying:

1. Open Hue on your site
2. Ask a question like: "How do I access my profile?"
3. Hue should respond with helpful information instead of the error message

## What Hue Knows

Hue is already trained with knowledge about:
- All platform pages and routes (Discover, News, Learn, Profile, Settings, etc.)
- Account types (Regular Users vs Artists)
- Features (Stripe integration, portfolio management, course creation, shop listings)
- Navigation (desktop sidebar, mobile bottom nav)
- Common tasks (how to sell artwork, create courses, edit profile)
- Settings sections

You don't need to train Hue - the knowledge is already in the code! You just need the API key to activate it.

## Troubleshooting

**Still seeing the error message?**
- See **HUE_TROUBLESHOOTING.md** for a complete step-by-step troubleshooting guide
- Wait a few minutes after redeploying (environment variables can take time to propagate)
- Check Vercel deployment logs for any errors
- Verify the API key is correct (no extra spaces, complete key)
- Check Google AI Studio to ensure the API key is active and has quota

**API Key Quota Issues?**
- Google AI Studio provides free tier with rate limits
- Check your usage in Google AI Studio dashboard
- Upgrade if needed for production use

**Quick Diagnostic:**
Run this in your browser console on your deployed site:
```javascript
fetch('/api/hue/ask-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'test', route: window.location.pathname })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

This will show you the exact API response and help identify the issue.
