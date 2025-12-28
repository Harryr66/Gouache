# Environment Variable Troubleshooting

## Issue: All Cloudflare env vars showing as MISSING

### Problem
Next.js isn't reading `NEXT_PUBLIC_` variables from `.env.local`.

### Solutions

#### 1. Verify File Location
`.env.local` must be in the **project root** (same folder as `package.json`).

#### 2. Verify File Format
Your `.env.local` should look exactly like this (no spaces around `=`):

```env
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=0decd87b85b00bfc12b56df1e88a7528
NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN=your_token_here
NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH=your_hash_here
NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN=your_token_here
```

**Common mistakes:**
- ❌ `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID = value` (spaces around =)
- ❌ `CLOUDFLARE_ACCOUNT_ID=value` (missing NEXT_PUBLIC_)
- ❌ Quotes around values (usually not needed)

#### 3. Restart Dev Server
After adding/changing `.env.local`:
1. **Stop** the server completely (Ctrl+C)
2. **Wait 2 seconds**
3. **Start** again: `npm run dev`
4. **Wait** for "Ready" message

#### 4. Clear Next.js Cache
If still not working, try:
```bash
rm -rf .next
npm run dev
```

#### 5. Verify Variables Are Read
Check terminal when starting dev server - should see:
```
- Environments: .env.local, .env
```

#### 6. Test in Browser Console
Open browser console on your upload page and run:
```javascript
console.log('Account ID:', process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID);
console.log('Stream Token:', process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN ? 'SET' : 'MISSING');
```

If they're still `undefined`, Next.js isn't reading the file.

---

## Quick Fix Checklist

- [ ] `.env.local` is in project root (same folder as `package.json`)
- [ ] Variable names start with `NEXT_PUBLIC_`
- [ ] No spaces around `=` sign
- [ ] No quotes around values (unless value contains spaces)
- [ ] Dev server was restarted after adding vars
- [ ] Terminal shows "Environments: .env.local, .env" when starting

---

## If Still Not Working

1. **Check file encoding** - Should be UTF-8
2. **Check for hidden characters** - Copy/paste variable names exactly
3. **Try `.env` instead** - Sometimes `.env.local` has issues
4. **Check Next.js version** - Should be 13+ for proper env var support

---

## Alternative: Use `.env` File

If `.env.local` isn't working, try adding to `.env` file instead (same format).


