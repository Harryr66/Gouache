# Genkit & Google AI Setup Guide

## Required Environment Variable

The docuseries generation feature requires a Google AI API key to be set in your environment variables.

### Setting up GOOGLE_GENAI_API_KEY

1. **Get your Google AI API Key:**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key

2. **Add to Local Development (.env.local):**
   ```env
   GOOGLE_GENAI_API_KEY=your_api_key_here
   ```

3. **Add to Vercel Production:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add a new variable:
     - **Name:** `GOOGLE_GENAI_API_KEY`
     - **Value:** Your Google AI API key
     - **Environment:** Production, Preview, Development (select all)
   - Click "Save"
   - **Important:** Redeploy your application after adding the environment variable

## Verification

After setting the API key:

1. **Local:** Restart your dev server (`npm run dev`)
2. **Production:** Redeploy on Vercel
3. **Test:** Try generating a docuseries article in the admin panel

## Troubleshooting

If you still get errors:

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for errors mentioning "GOOGLE_GENAI_API_KEY" or "API key"

2. **Verify API Key:**
   - Make sure the key is correct (no extra spaces)
   - Ensure it's a valid Google AI API key (not a different Google API key)

3. **Check Environment Variable:**
   - In Vercel, verify the variable is set for all environments
   - Make sure there are no typos in the variable name

4. **Redeploy:**
   - After adding/changing environment variables, you must redeploy
   - Vercel doesn't automatically pick up new env vars on existing deployments

## Current Status

The Genkit configuration is set up to use:
- **Model:** `googleai/gemini-2.0-flash`
- **Plugin:** `@genkit-ai/googleai`
- **API Key Source:** `GOOGLE_GENAI_API_KEY` environment variable

If the API key is missing, you'll see a clear error message: "AI service not configured - Google AI API key is missing."

