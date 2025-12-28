#!/bin/bash
echo "=== VERIFICATION CHECK ==="
echo "1. Checking old file doesn't exist..."
if [ -f "src/lib/media-upload.ts" ]; then
  echo "❌ OLD FILE STILL EXISTS!"
  exit 1
else
  echo "✅ Old file removed"
fi

echo "2. Checking new file exists..."
if [ ! -f "src/lib/media-upload-v2.ts" ]; then
  echo "❌ NEW FILE MISSING!"
  exit 1
else
  echo "✅ New file exists"
fi

echo "3. Checking for NEW CODE marker..."
if ! grep -q "NEW CODE V2.0 RUNNING" src/lib/media-upload-v2.ts; then
  echo "❌ NEW CODE MARKER MISSING!"
  exit 1
else
  echo "✅ New code marker found"
fi

echo "4. Checking imports..."
if ! grep -q "media-upload-v2" src/components/upload-artwork-basic.tsx; then
  echo "❌ IMPORTS NOT UPDATED!"
  exit 1
else
  echo "✅ Imports correct"
fi

echo "5. Checking API routes..."
if [ ! -f "src/app/api/upload/cloudflare-stream/route.ts" ]; then
  echo "❌ STREAM API ROUTE MISSING!"
  exit 1
else
  echo "✅ Stream API route exists"
fi

if [ ! -f "src/app/api/upload/cloudflare-images/route.ts" ]; then
  echo "❌ IMAGES API ROUTE MISSING!"
  exit 1
else
  echo "✅ Images API route exists"
fi

echo ""
echo "✅✅✅ ALL CHECKS PASSED ✅✅✅"
echo ""
echo "NOW DO THIS:"
echo "1. Stop dev server (Ctrl+C)"
echo "2. Run: rm -rf .next node_modules/.cache"
echo "3. Run: npm run dev"
echo "4. Wait for 'Ready' message"
echo "5. In browser: DevTools > Application > Clear storage > Clear site data"
echo "6. Close ALL browser tabs"
echo "7. Quit browser completely"
echo "8. Reopen browser and test"
