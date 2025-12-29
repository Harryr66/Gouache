import { NextRequest, NextResponse } from 'next/server';

/**
 * Get video details after upload
 * Note: Vercel functions have execution time limits (10s on Hobby, 60s on Pro)
 * This function will return immediately if video is ready, or poll for up to 25 seconds
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

    // Reduced wait time to avoid Vercel function timeout (25 seconds max)
    // Vercel Hobby plan has 10s timeout, Pro has 60s
    // We use 25s to be safe and allow for network latency
    const maxWaitTime = 25000; // 25 seconds
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    const fetchTimeout = 5000; // 5 seconds per fetch request

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Add timeout to fetch to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to check video status (${response.status}): ${errorText}`);
        }

        const { result, errors } = await response.json();

        // Check for API errors
        if (errors && errors.length > 0) {
          throw new Error(`Cloudflare API error: ${errors[0].message || 'Unknown error'}`);
        }

        if (!result) {
          throw new Error('No result returned from Cloudflare API');
        }

        // Video is ready
        if (result.status?.state === 'ready') {
          return NextResponse.json({
            videoId: result.uid,
            playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
            thumbnailUrl: result.thumbnail || `https://customer-${accountId}.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`,
            duration: result.duration || 0,
          });
        }

        // Video processing failed
        if (result.status?.state === 'error') {
          throw new Error(`Video processing failed: ${result.status?.pctComplete || result.status?.error || 'Unknown error'}`);
        }

        // Video is still processing - wait and poll again
        const elapsed = Date.now() - startTime;
        const remaining = maxWaitTime - elapsed;
        if (remaining > pollInterval) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          // Not enough time left for another poll, return processing status
          return NextResponse.json({
            videoId: result.uid,
            status: result.status?.state || 'processing',
            message: 'Video is still processing. Please check again in a few moments.',
            // Return what we have even if not ready
            playbackUrl: result.status?.state === 'ready' 
              ? `https://customer-${accountId}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`
              : undefined,
            thumbnailUrl: result.thumbnail || (result.status?.state === 'ready' 
              ? `https://customer-${accountId}.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`
              : undefined),
            duration: result.duration || 0,
          }, { status: 202 }); // 202 Accepted - processing
        }
      } catch (fetchError: any) {
        // If it's a timeout or network error, and we have time, retry
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('fetch')) {
          const elapsed = Date.now() - startTime;
          if (elapsed < maxWaitTime - pollInterval) {
            console.warn(`⚠️ Fetch error, retrying... (${fetchError.message})`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            continue;
          }
        }
        throw fetchError;
      }
    }

    // Timeout - return what we know
    return NextResponse.json(
      { 
        error: 'Video processing timeout',
        message: 'Video is still processing. The upload was successful, but processing is taking longer than expected. The video will be available shortly.',
        videoId: videoId,
      },
      { status: 202 } // 202 Accepted - still processing
    );
  } catch (error: any) {
    console.error('❌ Error in video-details route:', error);
    return NextResponse.json(
      { 
        error: `Failed to get video details: ${error.message || 'Unknown error'}`,
        details: error.stack || undefined,
      },
      { status: 500 }
    );
  }
}

