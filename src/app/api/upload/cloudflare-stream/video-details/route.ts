import { NextRequest, NextResponse } from 'next/server';

/**
 * Get video details after upload
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      );
    }

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Stream credentials not configured' },
        { status: 500 }
      );
    }

    // Wait for video processing
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check video status: ${response.statusText}`);
      }

      const { result } = await response.json();

      if (result.status?.state === 'ready') {
        return NextResponse.json({
          videoId: result.uid,
          playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
          thumbnailUrl: result.thumbnail || `https://customer-${accountId}.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`,
          duration: result.duration || 0,
        });
      }

      if (result.status?.state === 'error') {
        throw new Error(`Video processing failed: ${result.status?.pctComplete || 'Unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video processing timeout');
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to get video details: ${error.message}` },
      { status: 500 }
    );
  }
}

