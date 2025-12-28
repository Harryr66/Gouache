/**
 * Test file to check if Cloudflare env vars are accessible
 * Import this in a component to test
 */

export function testCloudflareEnv() {
  console.log('🧪 Testing Cloudflare Environment Variables...');
  console.log('🧪 Account ID:', process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ? 'SET ✅' : 'MISSING ❌');
  console.log('🧪 Stream Token:', process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN ? 'SET ✅' : 'MISSING ❌');
  console.log('🧪 Images Hash:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH ? 'SET ✅' : 'MISSING ❌');
  console.log('🧪 Images Token:', process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN ? 'SET ✅' : 'MISSING ❌');
  
  const allEnvVars = Object.keys(process.env).filter(k => k.includes('CLOUDFLARE'));
  console.log('🧪 All Cloudflare env vars found:', allEnvVars);
  
  return {
    accountId: !!process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID,
    streamToken: !!process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN,
    imagesHash: !!process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH,
    imagesToken: !!process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN,
  };
}

