import { NextResponse } from 'next/server';

/**
 * Server-side test to verify environment variables are being read
 * This runs on the server, not the client
 */
export async function GET() {
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  const streamToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;
  const imagesHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const imagesToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;

  // Get all NEXT_PUBLIC_ keys
  const allPublicKeys = Object.keys(process.env).filter(k => 
    k.startsWith('NEXT_PUBLIC_') && k.includes('CLOUDFLARE')
  );

  return NextResponse.json({
    serverSide: {
      accountId: accountId ? `SET (${accountId.substring(0, 8)}...)` : 'MISSING',
      streamToken: streamToken ? `SET (${streamToken.substring(0, 8)}...)` : 'MISSING',
      imagesHash: imagesHash ? `SET (${imagesHash.substring(0, 8)}...)` : 'MISSING',
      imagesToken: imagesToken ? `SET (${imagesToken.substring(0, 8)}...)` : 'MISSING',
    },
    allCloudflareKeys: allPublicKeys,
    note: 'If server shows SET but client shows MISSING, Next.js isn\'t embedding them in the bundle. Try: rm -rf .next && npm run dev',
  });
}


