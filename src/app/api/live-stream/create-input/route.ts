import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/live-stream/create-input
 * Create a Cloudflare Stream Live Input for streaming
 * 
 * Cloudflare Stream Live provides:
 * - RTMP/SRT/WebRTC ingest URLs
 * - HLS/DASH playback
 * - Global CDN delivery
 * - Low latency streaming
 * - Automatic recording
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamId, streamTitle, recordingEnabled } = body;

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Stream credentials not configured' },
        { status: 500 }
      );
    }

    // Create a Live Input on Cloudflare Stream
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: {
            name: streamTitle || `Live Stream ${streamId}`,
            streamId: streamId,
          },
          recording: {
            mode: recordingEnabled ? 'automatic' : 'off',
            timeoutSeconds: 0, // Keep recording until stream ends
          },
          // Default to low-latency mode
          defaultCreator: streamId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Live Input] Cloudflare API error:', error);
      return NextResponse.json(
        { error: error.errors?.[0]?.message || 'Failed to create live input' },
        { status: response.status }
      );
    }

    const { result } = await response.json();

    // Construct the streaming URLs
    const liveInput = {
      uid: result.uid,
      // RTMP URL for OBS/streaming software
      rtmpUrl: result.rtmps?.url || `rtmps://live.cloudflare.com:443/live`,
      rtmpStreamKey: result.rtmps?.streamKey || result.uid,
      // SRT URL (lower latency alternative)
      srtUrl: result.srt?.url,
      srtStreamId: result.srt?.streamId,
      // WebRTC URL (browser-based streaming)
      webRTCUrl: result.webRTC?.url,
      // Playback URL (HLS)
      playbackUrl: `https://customer-${accountId}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
      // Iframe embed URL
      embedUrl: `https://customer-${accountId}.cloudflarestream.com/${result.uid}/iframe`,
      // Thumbnail (will be available once streaming starts)
      thumbnailUrl: `https://customer-${accountId}.cloudflarestream.com/${result.uid}/thumbnails/thumbnail.jpg`,
    };

    console.log('[Live Input] Created successfully:', {
      uid: liveInput.uid,
      streamId,
    });

    return NextResponse.json({
      success: true,
      liveInput,
    });
  } catch (error: any) {
    console.error('[Live Input] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create live input' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/live-stream/create-input
 * Delete a Live Input when stream ends
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const liveInputId = searchParams.get('liveInputId');

    if (!liveInputId) {
      return NextResponse.json(
        { error: 'liveInputId is required' },
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

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs/${liveInputId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      console.error('[Live Input] Delete error:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Live Input] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete live input' },
      { status: 500 }
    );
  }
}
