# Hue Q&A Troubleshooting Guide

Follow these steps to identify why Hue is unable to answer questions.

## ⚠️ IMPORTANT: Network Tab Filter

If your Network tab shows a filter (like "artist-invites"), **clear it first**! The filter hides API requests. Click the "X" next to the filter text to see all requests.

## Step 1: Check Browser Console for Errors

1. **Open your website** where Hue is displayed
2. **Open Browser Developer Tools:**
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Safari**: Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+I`
   - **Mobile**: Use remote debugging or desktop browser
3. **Go to the "Console" tab**
4. **Ask Hue a question** (e.g., "Where is my profile?")
5. **Look for error messages** in red

**What to look for:**
- `Failed to fetch` - Network/API issue
- `500 Internal Server Error` - Server-side error
- `400 Bad Request` - Request format issue
- Any error mentioning `GOOGLE_GENAI_API_KEY`
- Any error mentioning `Genkit` or `AI`

**Note down any error messages you see.**

---

## Step 2: Check Network Requests

1. **Stay in Developer Tools**
2. **Go to the "Network" tab**
3. **Clear the network log** (click the 🚫 icon)
4. **Ask Hue a question again**
5. **Look for a request to `/api/hue/ask-question`**

**Check the request:**
- **Status Code**: Should be `200` (green). If `500` (red), there's a server error
- **Click on the request** to see details:
  - **Request Payload**: Should show `{ question: "...", route: "..." }`
  - **Response**: Click "Response" tab to see what the server returned

**Common issues:**
- **Status 500**: Server error - check Vercel logs (Step 3)
- **Status 400**: Bad request - check request payload format
- **CORS error**: Configuration issue
- **Request not appearing**: API route might not be deployed

---

## Step 3: Check Vercel Deployment Logs

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Select your project** (Gouache)
3. **Click on "Deployments"** tab
4. **Click on the latest deployment** (most recent)
5. **Click "View Build Logs"** or scroll to see logs
6. **Look for errors** during build or runtime

**What to check:**
- Build errors mentioning `GOOGLE_GENAI_API_KEY`
- Runtime errors when API is called
- Any Genkit/AI-related errors

**Also check Runtime Logs:**
1. In Vercel dashboard, go to **"Logs"** tab
2. **Ask Hue a question** on your live site
3. **Refresh the logs** - you should see new log entries
4. **Look for:**
   - `GOOGLE_GENAI_API_KEY not set` - API key missing
   - `Failed to generate AI answer` - AI generation failed
   - Any error stack traces

---

## Step 4: Verify Environment Variables in Vercel

1. **In Vercel Dashboard**, go to your project
2. **Click "Settings"** → **"Environment Variables"**
3. **Look for `GOOGLE_GENAI_API_KEY`**

**Check:**
- ✅ **Does it exist?** If not, you need to add it (see HUE_QA_SETUP.md)
- ✅ **Is the value correct?** Should start with `AIza...`
- ✅ **Which environments is it set for?** Should include "Production" at minimum
- ✅ **When was it added?** If added after last deployment, you need to redeploy

**If missing or incorrect:**
1. Click "Add New" or edit existing
2. Name: `GOOGLE_GENAI_API_KEY`
3. Value: Your API key from Google AI Studio
4. Select environments: Production, Preview, Development
5. Click "Save"
6. **Redeploy your application** (go to Deployments → click "..." → Redeploy)

---

## Step 5: Test API Key Directly

1. **Get your API key** from Google AI Studio
2. **Test it works:**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Try making a test request in the playground
   - Or use curl:
     ```bash
     curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
       -H 'Content-Type: application/json' \
       -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
     ```
3. **Check API key quota:**
   - In Google AI Studio, check your usage/quota
   - Ensure you haven't exceeded rate limits
   - Check if the key is still active

---

## Step 6: Test the API Endpoint Directly

1. **Get your deployed site URL** (e.g., `https://gouache.art`)
2. **Open a new browser tab** or use curl/Postman
3. **Make a direct API call:**

**Using Browser:**
- Open Developer Tools → Console
- Run:
  ```javascript
  fetch('/api/hue/ask-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Where is my profile?', route: '/test' })
  })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
  ```

**Using curl:**
```bash
curl -X POST https://your-site.vercel.app/api/hue/ask-question \
  -H "Content-Type: application/json" \
  -d '{"question":"Where is my profile?","route":"/test"}'
```

**Check the response:**
- If you get an answer → API is working, issue might be in frontend
- If you get an error → Check the error message for clues
- If you get `GOOGLE_GENAI_API_KEY not set` → API key not configured

---

## Step 7: Check Server-Side Code

1. **Check if the API route exists:**
   - File should be at: `src/app/api/hue/ask-question/route.ts`
   - Verify it's committed and deployed

2. **Check Genkit configuration:**
   - File: `src/ai/genkit.ts`
   - Should import and configure Genkit correctly

3. **Verify imports:**
   - Check that `@genkit-ai/googleai` is in `package.json`
   - Run `npm install` if needed

---

## Step 8: Common Issues & Solutions

### Issue: "GOOGLE_GENAI_API_KEY not set"
**Solution:**
- Add the environment variable in Vercel
- Redeploy the application
- Wait a few minutes for propagation

### Issue: "Failed to generate AI answer"
**Possible causes:**
- API key is invalid or expired
- API quota exceeded
- Network issue
- Genkit configuration problem

**Solution:**
- Verify API key in Google AI Studio
- Check API quota/usage
- Review Vercel logs for specific error

### Issue: "Network error" or "Failed to fetch"
**Possible causes:**
- API route not deployed
- CORS issue
- Network connectivity

**Solution:**
- Verify deployment succeeded
- Check if API route is accessible
- Check browser network tab

### Issue: API returns 500 error
**Solution:**
- Check Vercel runtime logs (Step 3)
- Look for stack traces
- Verify all dependencies are installed
- Check Genkit is properly configured

---

## Step 9: Enable Detailed Logging

The code already includes console logging. To see more details:

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Filter by "hue" or "ask-question"
   - Look for `console.log` and `console.error` messages

2. **Check what's being logged:**
   - `GOOGLE_GENAI_API_KEY is set` - Good sign
   - `GOOGLE_GENAI_API_KEY not set` - Problem identified
   - `Failed to generate AI answer:` - Check the error details
   - `Available env vars:` - Shows what env vars are available

---

## Step 10: Quick Diagnostic Checklist

Run through this checklist:

- [ ] `GOOGLE_GENAI_API_KEY` exists in Vercel environment variables
- [ ] API key value is correct (starts with `AIza...`)
- [ ] Environment variable is set for "Production" environment
- [ ] Application was redeployed after adding/updating the API key
- [ ] API key is active in Google AI Studio
- [ ] API key hasn't exceeded quota
- [ ] Browser console shows no frontend errors
- [ ] Network tab shows API request is being made
- [ ] API endpoint returns a response (not 404 or 500)
- [ ] Vercel logs show the API is being called
- [ ] Vercel logs show no server-side errors

---

## Still Not Working?

If you've gone through all steps and Hue still can't answer:

1. **Share the following information:**
   - Browser console errors (screenshot)
   - Network request details (screenshot)
   - Vercel log errors (copy/paste)
   - API key status (is it set? when was it added?)

2. **Try a fresh deployment:**
   - In Vercel, go to Deployments
   - Click "..." → "Redeploy"
   - Wait for deployment to complete
   - Test again

3. **Verify the API key works:**
   - Test it directly in Google AI Studio playground
   - Ensure it's not restricted or expired

4. **Check for recent changes:**
   - Did you recently update dependencies?
   - Did you modify the API route?
   - Check git history for recent changes

---

## Quick Test Command

Run this in your browser console on your deployed site to test the API:

```javascript
fetch('/api/hue/ask-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'test', route: window.location.pathname })
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => {
  console.log('Response:', data);
  if (data.error) {
    console.error('Error:', data.error, data.details);
  }
})
.catch(err => console.error('Fetch error:', err));
```

This will show you exactly what the API is returning and help identify the issue.
