# Fix Stripe Key Loading Issue

## The Problem
The error `[DEBUG] Stripe not available - stripePromise is null` means that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not being loaded from your `.env.local` file.

## Why This Happens
Next.js embeds `NEXT_PUBLIC_*` environment variables into the JavaScript bundle **at build time** when the dev server starts. If you:
- Added the variable while the server was running
- Fixed spaces in `.env.local` without restarting
- Have cached builds in `.next` folder

Then the variable won't be available in your app.

## Solution: Full Server Restart with Cache Clear

**Follow these steps EXACTLY:**

### Step 1: Stop the Dev Server
1. Go to your terminal where `npm run dev` is running
2. Press `Ctrl+C` (or `Cmd+C` on Mac) to stop the server
3. Wait until the process fully stops

### Step 2: Clear the Build Cache
Run this command in your terminal:

```bash
rm -rf .next
```

This deletes the cached build folder that Next.js uses.

### Step 3: Verify Your .env.local File
Make sure your `.env.local` file has the Stripe key with **NO SPACES** around the `=`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

**NOT:**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_xxxxxxxxxxxxx  ❌ (has spaces)
```

### Step 4: Restart the Dev Server
```bash
npm run dev
```

**Important:** Wait until you see "Ready in Xms" - the server must fully start before variables are loaded.

### Step 5: Hard Refresh Your Browser
1. Go to your course enrollment page
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux) to hard refresh
3. This clears the browser cache and loads the new bundle

### Step 6: Check the Console Logs
Open your browser's Developer Console (F12 or Cmd+Option+I) and look for:

```
[DEBUG COURSE PAGE] Stripe initialization at module load: {
  keyExists: true,  ← Should be true
  keyLength: 123,   ← Should be a number > 0
  willLoadStripe: true,  ← Should be true
  stripePromise: {...}  ← Should not be null
}
```

If you see `keyExists: false` or `keyLength: 0`, the variable is still not being loaded.

## If It Still Doesn't Work

### Check 1: Verify .env.local Location
Make sure `.env.local` is in the **root** of your project (same folder as `package.json`):
```
/Users/harry/Desktop/HR STORES LLC/SOMA CODE BASE/.env.local
```

### Check 2: Check Terminal Output
When you start `npm run dev`, look for this line in the terminal:
```
- Environments: .env.local, .env
```
This confirms Next.js is reading your `.env.local` file.

### Check 3: Verify the Key Format
Your Stripe publishable key should start with:
- `pk_test_` for test keys
- `pk_live_` for live keys

### Check 4: Try Adding to next.config.js (Last Resort)
If the above doesn't work, we can add the Stripe key to `next.config.js` similar to how Cloudflare keys are handled. But try the restart first!

## What to Look For After Fix

When you click "Enroll Now" on a paid course, you should see:
1. ✅ `[DEBUG COURSE PAGE] Stripe initialization at module load` showing `keyExists: true`
2. ✅ `[DEBUG] Opening checkout dialog` (not the error message)
3. ✅ A Stripe payment form appears in a dialog

If you see `stripePromise is null` error, the key is still not loading and you need to check the steps above again.

