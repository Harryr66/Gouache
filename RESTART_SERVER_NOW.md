# 🚨 CRITICAL: You MUST Restart Your Dev Server

## The Problem
Your code is correct, but `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not being loaded because Next.js embeds environment variables when the dev server **starts**, not when code changes.

## What You MUST Do RIGHT NOW

### Step 1: STOP Your Dev Server
1. Go to your terminal where `npm run dev` is running
2. Press `Ctrl+C` (or `Cmd+C` on Mac)
3. **WAIT** until it fully stops (you should see your command prompt again)

### Step 2: Verify .env.local File
Make sure your `.env.local` file has this line with **NO SPACES**:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_yourkeyhere
```

### Step 3: RESTART Your Dev Server
```bash
npm run dev
```

**IMPORTANT:** Wait until you see "Ready in Xms" - the server must fully start.

### Step 4: Hard Refresh Browser
1. Open your course page
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. Open the browser console (F12)

### Step 5: Check the Console Logs
Look for this log when you click "Enroll Now":
```
[DEBUG] getStripePromise() called - RAW CHECK:
```

**If you see:**
- `rawEnvVar: undefined` or `keyLength: 0` → The env var is NOT being loaded
- `rawEnvVar: "pk_test_..."` → The env var IS loaded, something else is wrong

## Why This Happens
Next.js reads `.env.local` **once** when the server starts. If you:
- Added the variable while server was running
- Fixed spaces without restarting
- Started server before adding the variable

Then the variable won't be in the JavaScript bundle.

## If It Still Doesn't Work
Check your terminal output when starting `npm run dev` - it should show:
```
- Environments: .env.local, .env
```

If you don't see this, Next.js isn't reading your `.env.local` file.

