import { NextRequest, NextResponse } from 'next/server';

/**
 * Delete an image from Cloudflare Images
 * DELETE /api/delete/cloudflare-images?imageId={imageId}
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Images credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🗑️ Deleting image from Cloudflare Images:', {
      imageId,
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
    });

    const deleteResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
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

      console.error('❌ Failed to delete image from Cloudflare Images:', {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        error: error.errors?.[0]?.message || errorText,
      });

      // If image not found (404), consider it already deleted
      if (deleteResponse.status === 404) {
        return NextResponse.json({
          success: true,
          message: 'Image not found (may already be deleted)',
        });
      }

      return NextResponse.json(
        { 
          error: error.errors?.[0]?.message || 'Failed to delete image from Cloudflare Images',
          status: deleteResponse.status,
        },
        { status: deleteResponse.status }
      );
    }

    console.log('✅ Image deleted from Cloudflare Images:', imageId);
    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting image from Cloudflare Images:', error);
    return NextResponse.json(
      { error: `Failed to delete image: ${error.message}` },
      { status: 500 }
    );
  }
}

