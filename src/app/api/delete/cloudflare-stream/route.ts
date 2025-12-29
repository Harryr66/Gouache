import { NextRequest, NextResponse } from 'next/server';

/**
 * Delete a video from Cloudflare Stream
 * DELETE /api/delete/cloudflare-stream?videoId={videoId}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
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

    console.log('🗑️ Deleting video from Cloudflare Stream:', {
      videoId,
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
    });

    const deleteResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { errors: [{ message: errorText }] };
      }

      console.error('❌ Failed to delete video from Cloudflare Stream:', {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        error: error.errors?.[0]?.message || errorText,
      });

      // If video not found (404), consider it already deleted
      if (deleteResponse.status === 404) {
        return NextResponse.json({
          success: true,
          message: 'Video not found (may already be deleted)',
        });
      }

      return NextResponse.json(
        { 
          error: error.errors?.[0]?.message || 'Failed to delete video from Cloudflare Stream',
          status: deleteResponse.status,
        },
        { status: deleteResponse.status }
      );
    }

    console.log('✅ Video deleted from Cloudflare Stream:', videoId);
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting video from Cloudflare Stream:', error);
    return NextResponse.json(
      { error: `Failed to delete video: ${error.message}` },
      { status: 500 }
    );
  }
}

