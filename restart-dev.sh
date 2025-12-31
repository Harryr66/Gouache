#!/bin/bash
# Stop any running dev server processes (if needed)
pkill -f "next dev" || true
# Clear build cache
rm -rf .next
# Start dev server
npm run dev

