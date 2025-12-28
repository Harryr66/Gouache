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

    // Debug: Log environment variable status
    console.log('🔍 Cloudflare Images API: Environment check...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      accountHash: accountHash ? `${accountHash.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      tokenLength: apiToken ? apiToken.length : 0,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE')),
    });

    if (!accountId || !apiToken) {
      console.error('❌ Cloudflare Images: Missing credentials', {
        hasAccountId: !!accountId,
        hasApiToken: !!apiToken,
        envKeys: Object.keys(process.env).filter(k => k.includes('CLOUDFLARE')),
      });
      return NextResponse.json(
        { 
          error: 'Cloudflare Images credentials not configured',
          details: {
            hasAccountId: !!accountId,
            hasApiToken: !!apiToken,
          }
        },
        { status: 500 }
      );
    }

    console.log('🔍 Cloudflare Images API: Uploading image...', {
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
      accountHash: accountHash ? `${accountHash.substring(0, 8)}...` : 'MISSING',
      hasToken: !!apiToken,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
    });

    // Upload image to Cloudflare Images
    // Convert File to Blob for proper FormData handling in Node.js
    let formDataToSend: FormData;
    try {
      const fileBuffer = await file.arrayBuffer();
      const fileBlob = new Blob([fileBuffer], { type: file.type });
      
      formDataToSend = new FormData();
      formDataToSend.append('file', fileBlob, file.name);
    } catch (formDataError: any) {
      console.error('❌ Error creating FormData:', formDataError);
      return NextResponse.json(
        { error: `Failed to prepare file for upload: ${formDataError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(
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
    } catch (fetchError: any) {
      console.error('❌ Error calling Cloudflare Images API:', fetchError);
      return NextResponse.json(
        { error: `Failed to connect to Cloudflare Images: ${fetchError.message || 'Network error'}` },
        { status: 500 }
      );
    }

    if (!uploadResponse.ok) {
      let errorText: string;
      try {
        errorText = await uploadResponse.text();
      } catch (textError) {
        errorText = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
      }
      
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
        { error: `Failed to upload image: ${error.errors?.[0]?.message || errorText || 'Unknown error'}` },
        { status: uploadResponse.status >= 400 && uploadResponse.status < 600 ? uploadResponse.status : 500 }
      );
    }

    let responseData: any;
    try {
      responseData = await uploadResponse.json();
    } catch (jsonError: any) {
      console.error('❌ Error parsing Cloudflare Images response:', jsonError);
      return NextResponse.json(
        { error: `Failed to parse Cloudflare Images response: ${jsonError.message || 'Invalid JSON'}` },
        { status: 500 }
      );
    }

    if (!responseData || !responseData.result) {
      console.error('❌ Invalid Cloudflare Images response structure:', responseData);
      return NextResponse.json(
        { error: 'Invalid response from Cloudflare Images API' },
        { status: 500 }
      );
    }

    const { result } = responseData;
    const imageId = result.id;

    if (!imageId) {
      console.error('❌ Missing image ID in Cloudflare Images response:', result);
      return NextResponse.json(
        { error: 'Cloudflare Images did not return an image ID' },
        { status: 500 }
      );
    }

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
    console.error('❌ Unexpected error in Cloudflare Images upload:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
    });
    return NextResponse.json(
      { 
        error: `Cloudflare Images upload failed: ${error?.message || 'Unknown error'}`,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

