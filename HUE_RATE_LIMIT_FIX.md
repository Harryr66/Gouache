# Fixing Hue Rate Limit Error

## Current Situation
- ✅ API key is set in Vercel (`GOOGLE_GENAI_API_KEY`)
- ✅ Build completed successfully
- ❌ Hue shows: "AI service has reached its rate limit"
- ❌ No errors in console/network (but network tab is filtered)

## Step-by-Step Diagnosis

### Step 1: Check Network Tab (Remove Filter)

1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Clear the filter** - Click the "X" next to "artist-invites" in the filter box
4. **Clear the network log** (click 🚫 icon)
5. **Ask Hue a question** (e.g., "Where is my profile?")
6. **Look for `/api/hue/ask-question`** in the request list

**What to check:**
- **Status code**: Should be 200 (green) or 500 (red)
- **Click on the request** → **Response tab** → See what the server returned
- **Headers tab** → Check if request was sent correctly

### Step 2: Check Vercel Runtime Logs

1. **Go to Vercel Dashboard** → Your Project
2. **Click "Logs" tab** (not "Deployments")
3. **Ask Hue a question** on your live site
4. **Refresh the logs** (or wait a few seconds)
5. **Look for new log entries** with timestamps matching when you asked

**What to look for:**
- `GOOGLE_GENAI_API_KEY is set, attempting to generate answer...`
- `Calling Genkit AI generate...`
- `Failed to generate AI answer:` - This will show the actual error
- `Error details:` - This will show the full error information

**Common log messages:**
- If you see `GOOGLE_GENAI_API_KEY not set` → API key not accessible at runtime
- If you see `429` or `rate limit` → Actually hitting Google's rate limits
- If you see `403` → API key permissions issue
- If you see `401` → Invalid API key

### Step 3: Verify API Key in Google AI Studio

1. **Go to [Google AI Studio](https://aistudio.google.com/)**
2. **Check your API key status:**
   - Is it active?
   - Has it exceeded quota?
   - Check "Usage" or "Quota" section
3. **Test the API key directly:**
   - Use the playground in Google AI Studio
   - Try making a simple request
   - Does it work there?

### Step 4: Check API Key Quota

1. **In Google AI Studio**, go to **"Usage"** or **"Quota"**
2. **Check:**
   - Requests per minute limit
   - Requests per day limit
   - Current usage
3. **If quota exceeded:**
   - Wait for quota to reset (usually resets hourly/daily)
   - Or upgrade your Google AI Studio plan

### Step 5: Test API Endpoint Directly

Run this in your browser console on your deployed site:

```javascript
fetch('/api/hue/ask-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'test', route: window.location.pathname })
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  console.log('Response:', text);
  try {
    const data = JSON.parse(text);
    console.log('Parsed:', data);
    if (data.answer) {
      console.log('Answer:', data.answer);
    }
    if (data.error) {
      console.error('Error:', data.error, data.details);
    }
  } catch (e) {
    console.error('Failed to parse:', e);
  }
})
.catch(err => console.error('Fetch error:', err));
```

This will show you:
- The exact HTTP status code
- The raw response from the server
- Any error messages

### Step 6: Check if API Key is Accessible at Runtime

The API key might be set in Vercel but not accessible to the serverless function. Check:

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Verify:**
   - `GOOGLE_GENAI_API_KEY` exists
   - It's set for **"Production"** environment (or "All Environments")
   - The value is correct (no extra spaces)
3. **Redeploy** after adding/updating:
   - Go to **Deployments**
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**

### Step 7: Common Issues & Solutions

#### Issue: "Rate limit" but quota not exceeded
**Possible causes:**
- API key is being used by multiple services
- Rapid requests (hitting per-minute limits)
- Free tier limits

**Solution:**
- Wait a few minutes and try again
- Check Google AI Studio for actual quota usage
- Consider upgrading if needed

#### Issue: API key set but still getting errors
**Possible causes:**
- Environment variable not accessible at runtime
- Need to redeploy after adding variable
- Variable set for wrong environment

**Solution:**
- Redeploy the application
- Verify variable is set for Production
- Check Vercel logs to confirm variable is accessible

#### Issue: No errors but Hue doesn't work
**Possible causes:**
- Network tab filter hiding the request
- API returning success but with error message
- Frontend not handling response correctly

**Solution:**
- Remove network tab filter
- Check response in Network tab
- Check browser console for any JavaScript errors

## Quick Diagnostic Commands

**In Browser Console:**
```javascript
// Test the API
fetch('/api/hue/ask-question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'test', route: '/' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Check Environment Variable (in Vercel Logs):**
Look for log message: `GOOGLE_GENAI_API_KEY is set, attempting to generate answer...`

If you see this → API key is accessible
If you don't see this → API key not accessible, check Vercel settings

## Next Steps

1. **Remove the network tab filter** and check the actual API request
2. **Check Vercel runtime logs** to see the actual error
3. **Share the log output** so we can identify the exact issue

The improved error logging I just added will show much more detail in the Vercel logs, which will help us identify the exact problem.
