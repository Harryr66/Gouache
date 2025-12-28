import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API route for uploading images to Cloudflare Images
 * This keeps API tokens secure and avoids CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Cloudflare Images uses account ID (same as Stream), not account hash
    // The account hash is only for the delivery URL (imagedelivery.net)
    const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
    const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Images credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Cloudflare Images API: Uploading image...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      accountHash: accountHash ? `${accountHash.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      fileSize: file.size,
      fileName: file.name,
    });

    // Upload image to Cloudflare Images
    // Convert File to Blob for proper FormData handling in Node.js
    const fileBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileBuffer], { type: file.type });
    
    const formDataToSend = new FormData();
    formDataToSend.append('file', fileBlob, file.name);

    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          // Don't set Content-Type - fetch will set it with boundary for FormData
        },
        body: formDataToSend,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { errors: [{ message: errorText }] };
      }
      console.error('❌ Cloudflare Images API Error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: error.errors?.[0]?.message || errorText,
        fullError: error,
      });
      return NextResponse.json(
        { error: `Failed to upload image: ${error.errors?.[0]?.message || 'Unknown error'}` },
        { status: uploadResponse.status }
      );
    }

    const { result } = await uploadResponse.json();
    const imageId = result.id;

    // Cloudflare Images returns the image ID
    // We need to construct the delivery URL using the account hash
    // If account hash is not available, use the default public variant
    const baseUrl = accountHash 
      ? `https://imagedelivery.net/${accountHash}/${imageId}/public`
      : result.variants?.[0] || `https://imagedelivery.net/${imageId}/public`;

    // Generate variant URLs (Cloudflare Images supports on-the-fly resizing via URL params)
    const variants = {
      thumbnail: accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/thumbnail` : baseUrl,
      small: accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/small` : baseUrl,
      medium: accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/medium` : baseUrl,
      large: accountHash ? `https://imagedelivery.net/${accountHash}/${imageId}/large` : baseUrl,
      full: baseUrl,
    };

    console.log('✅ Cloudflare Images upload successful:', {
      imageId,
      baseUrl,
      hasVariants: !!accountHash,
    });

    return NextResponse.json({
      imageId,
      url: variants.medium, // Default to medium size
      variants,
      provider: 'cloudflare',
      width: result.metadata?.width || result.dimensions?.width,
      height: result.metadata?.height || result.dimensions?.height,
    });
  } catch (error: any) {
    console.error('Error uploading image to Cloudflare Images:', error);
    return NextResponse.json(
      { error: `Cloudflare Images upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}

