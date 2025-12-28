/**
 * Test file to check if Cloudflare env vars are accessible
 * Import this in a component to test
 */

export function testCloudflareEnv() {
  console.log('🧪 Testing Cloudflare Environment Variables...');
  
  // Debug: Log all process.env keys to see what's available
  const allEnvKeys = Object.keys(process.env);
  const cloudflareKeys = allEnvKeys.filter(k => k.includes('CLOUDFLARE'));
  console.log('🧪 All process.env keys (first 20):', allEnvKeys.slice(0, 20));
  console.log('🧪 Cloudflare-related keys found:', cloudflareKeys);
  
  // Try direct access
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const streamToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;
  const imagesHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const imagesToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;
  
  console.log('🧪 Account ID:', accountId ? `SET ✅ (${accountId.substring(0, 8)}...)` : 'MISSING ❌');
  console.log('🧪 Stream Token:', streamToken ? `SET ✅ (${streamToken.substring(0, 8)}...)` : 'MISSING ❌');
  console.log('🧪 Images Hash:', imagesHash ? `SET ✅ (${imagesHash.substring(0, 8)}...)` : 'MISSING ❌');
  console.log('🧪 Images Token:', imagesToken ? `SET ✅ (${imagesToken.substring(0, 8)}...)` : 'MISSING ❌');
  
  // Also try window.__ENV__ or other Next.js internal methods
  if (typeof window !== 'undefined') {
    console.log('🧪 window.__NEXT_DATA__?.env:', (window as any).__NEXT_DATA__?.env);
  }
  
  return {
    accountId: !!process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
    streamToken: !!process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN,
    imagesHash: !!process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH,
    imagesToken: !!process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN,
  };
}

