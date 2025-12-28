// Quick test to verify Cloudflare API routes work
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Cloudflare Environment Variables:');
console.log('Account ID:', process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ? 'SET ✅' : 'MISSING ❌');
console.log('Stream Token:', process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN ? 'SET ✅' : 'MISSING ❌');
console.log('Images Hash:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH ? 'SET ✅' : 'MISSING ❌');
console.log('Images Token:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN ? 'SET ✅' : 'MISSING ❌');

if (
  process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID &&
  process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN &&
  process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH &&
  process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN
) {
  console.log('\n✅ All Cloudflare credentials are configured!');
  console.log('The API routes should work. Restart your dev server and try uploading.');
} else {
  console.log('\n❌ Missing credentials. Check your .env.local file.');
}

