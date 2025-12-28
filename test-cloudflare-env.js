// Quick test script to check if env vars are accessible
// Run this in browser console on your upload page

console.log('Testing Cloudflare env vars...');
console.log('NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID:', process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING');
console.log('NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN:', process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN ? 'SET' : 'MISSING');
console.log('NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH ? 'SET' : 'MISSING');
console.log('NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN ? 'SET' : 'MISSING');

// Also check all env vars
console.log('All NEXT_PUBLIC_ vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));

