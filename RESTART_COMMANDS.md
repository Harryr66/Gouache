# Dev Server Restart Commands

## Quick Restart (Recommended)

**If your dev server is already stopped**, run:
```bash
rm -rf .next && npm run dev
```

## Full Restart Process

**Step 1:** In your terminal where `npm run dev` is running, press:
- Mac/Linux: `Ctrl+C`
- Windows: `Ctrl+C`

**Step 2:** Clear the build cache:
```bash
rm -rf .next
```

**Step 3:** Start the dev server:
```bash
npm run dev
```

## One-Liner (if server is stopped)
```bash
rm -rf .next && npm run dev
```

---

**Note:** Wait for "Ready in Xms" message before testing!

